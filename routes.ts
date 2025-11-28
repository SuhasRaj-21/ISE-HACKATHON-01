import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, loginUser, signupUser, isAuthenticated, hashPassword } from "./auth";
import { analyzeSymptoms } from "./openai";
import { loginSchema, signupSchema, insertTriageSessionSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { user, error } = await loginUser(validatedData);
      
      if (error || !user) {
        return res.status(401).json({ message: error || "Login failed" });
      }
      
      (req.session as any).userId = user.id;
      (req.session as any).isGuest = false;
      
      res.json(user);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      const { user, error } = await signupUser(validatedData);
      
      if (error || !user) {
        return res.status(400).json({ message: error || "Signup failed" });
      }
      
      (req.session as any).userId = user.id;
      (req.session as any).isGuest = false;
      
      res.json(user);
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ message: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/guest", async (req, res) => {
    try {
      // Create a guest session without a real user
      const guestId = `guest-${randomUUID()}`;
      (req.session as any).userId = guestId;
      (req.session as any).isGuest = true;
      
      res.json({ id: guestId, isGuest: true });
    } catch (error: any) {
      console.error("Guest session error:", error);
      res.status(500).json({ message: "Could not create guest session" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    const isGuest = (req.session as any)?.isGuest;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isGuest) {
      return res.json({ id: userId, isGuest: true, firstName: "Guest", lastName: "User" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Triage routes
  app.post("/api/triage/analyze", async (req, res) => {
    try {
      const { symptoms, quickTriageTypes } = req.body;
      
      if (!symptoms || symptoms.trim() === "") {
        return res.status(400).json({ message: "Symptoms are required" });
      }
      
      const userId = (req.session as any)?.userId;
      const isGuest = (req.session as any)?.isGuest;
      
      // Analyze symptoms with AI
      const analysis = await analyzeSymptoms(symptoms);
      
      // Create triage session
      const session = await storage.createTriageSession({
        userId: isGuest ? null : userId,
        symptoms,
        quickTriageType: quickTriageTypes?.join(", ") || null,
        riskLevel: analysis.riskLevel,
        triagePriority: analysis.triagePriority,
        aiAnalysis: analysis,
        recommendations: analysis.recommendations,
        causes: analysis.causes,
        expectedConditions: analysis.expectedConditions,
        actionRequired: analysis.actionRequired,
        isGuest: isGuest || false,
      });
      
      res.json({ sessionId: session.id, ...analysis });
    } catch (error: any) {
      console.error("Triage analysis error:", error);
      res.status(500).json({ message: error.message || "Analysis failed" });
    }
  });

  app.get("/api/triage/session/:id", async (req, res) => {
    try {
      const session = await storage.getTriageSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ message: "Error fetching session" });
    }
  });

  app.get("/api/triage/history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const sessions = await storage.getTriageSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get history error:", error);
      res.status(500).json({ message: "Error fetching history" });
    }
  });

  // Vitals routes
  app.get("/api/vitals", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const vitalsList = await storage.getVitalsByUser(userId);
      res.json(vitalsList);
    } catch (error) {
      console.error("Get vitals error:", error);
      res.status(500).json({ message: "Error fetching vitals" });
    }
  });

  app.post("/api/vitals", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const vital = await storage.createVitals({
        userId,
        ...req.body,
      });
      res.json(vital);
    } catch (error) {
      console.error("Create vitals error:", error);
      res.status(500).json({ message: "Error creating vitals record" });
    }
  });

  // Consultation routes
  app.get("/api/consultations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const consultationsList = await storage.getConsultationsByUser(userId);
      res.json(consultationsList);
    } catch (error) {
      console.error("Get consultations error:", error);
      res.status(500).json({ message: "Error fetching consultations" });
    }
  });

  app.post("/api/consultations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const consultation = await storage.createConsultation({
        userId,
        consultationType: req.body.consultationType,
        triageSessionId: req.body.triageSessionId || null,
        notes: req.body.notes || null,
        status: "pending",
      });
      res.json(consultation);
    } catch (error) {
      console.error("Create consultation error:", error);
      res.status(500).json({ message: "Error creating consultation" });
    }
  });

  // Seed data route (for development)
  app.post("/api/seed", async (req, res) => {
    try {
      // Create mock patients
      const patients = [
        { email: "abc123@gmail.com", password: "abc123", firstName: "John", lastName: "Smith" },
        { email: "abc456@gmail.com", password: "abc123", firstName: "Sarah", lastName: "Johnson" },
        { email: "abc789@gmail.com", password: "abc123", firstName: "Michael", lastName: "Brown" },
      ];
      
      for (const patient of patients) {
        const existingUser = await storage.getUserByEmail(patient.email);
        if (!existingUser) {
          const hashedPassword = await hashPassword(patient.password);
          const user = await storage.createUser({
            email: patient.email,
            password: hashedPassword,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phone: null,
          });
          
          // Add sample vitals for the past 7 days
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            await storage.createVitals({
              userId: user.id,
              heartRate: 65 + Math.floor(Math.random() * 20),
              temperature: (97.5 + Math.random() * 2).toFixed(1),
              bloodPressureSystolic: 110 + Math.floor(Math.random() * 20),
              bloodPressureDiastolic: 70 + Math.floor(Math.random() * 10),
              oxygenSaturation: 96 + Math.floor(Math.random() * 4),
              respiratoryRate: 12 + Math.floor(Math.random() * 6),
            });
          }
        }
      }
      
      res.json({ message: "Seed data created successfully" });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ message: error.message || "Seeding failed" });
    }
  });

  return httpServer;
}
