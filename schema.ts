import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table - patients with email/password auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  dateOfBirth: varchar("date_of_birth"),
  bloodType: varchar("blood_type"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Triage sessions - each symptom submission
export const triageSessions = pgTable("triage_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  symptoms: text("symptoms").notNull(),
  quickTriageType: varchar("quick_triage_type"), // headache, fever, cough, etc.
  riskLevel: varchar("risk_level").notNull(), // green, yellow, red
  triagePriority: varchar("triage_priority").notNull(), // P1, P2, P3, P4
  aiAnalysis: jsonb("ai_analysis"), // Full AI response
  recommendations: text("recommendations"),
  causes: text("causes"),
  expectedConditions: text("expected_conditions"),
  actionRequired: text("action_required"),
  isGuest: boolean("is_guest").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vital signs records
export const vitals = pgTable("vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  heartRate: integer("heart_rate"), // BPM
  temperature: varchar("temperature"), // in Fahrenheit
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  oxygenSaturation: integer("oxygen_saturation"), // SpO2 percentage
  respiratoryRate: integer("respiratory_rate"),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Consultation bookings
export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  triageSessionId: varchar("triage_session_id").references(() => triageSessions.id),
  consultationType: varchar("consultation_type").notNull(), // chronic_care, urgent, follow_up
  status: varchar("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  scheduledAt: timestamp("scheduled_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  triageSessions: many(triageSessions),
  vitals: many(vitals),
  consultations: many(consultations),
}));

export const triageSessionsRelations = relations(triageSessions, ({ one }) => ({
  user: one(users, {
    fields: [triageSessions.userId],
    references: [users.id],
  }),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  user: one(users, {
    fields: [vitals.userId],
    references: [users.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  user: one(users, {
    fields: [consultations.userId],
    references: [users.id],
  }),
  triageSession: one(triageSessions, {
    fields: [consultations.triageSessionId],
    references: [triageSessions.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const insertTriageSessionSchema = createInsertSchema(triageSessions).omit({
  id: true,
  createdAt: true,
});

export const insertVitalsSchema = createInsertSchema(vitals).omit({
  id: true,
  recordedAt: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export type TriageSession = typeof triageSessions.$inferSelect;
export type InsertTriageSession = z.infer<typeof insertTriageSessionSchema>;

export type Vitals = typeof vitals.$inferSelect;
export type InsertVitals = z.infer<typeof insertVitalsSchema>;

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

// Risk level types
export type RiskLevel = "green" | "yellow" | "red";
export type TriagePriority = "P1" | "P2" | "P3" | "P4";

export interface AITriageResponse {
  riskLevel: RiskLevel;
  triagePriority: TriagePriority;
  recommendations: string;
  causes: string;
  expectedConditions: string;
  actionRequired: string;
  awareness: string;
}
