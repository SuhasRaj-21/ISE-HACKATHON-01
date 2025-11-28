import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Bell, 
  Activity, 
  HeartPulse,
  Thermometer,
  Wind,
  Brain,
  MoreHorizontal,
  Send,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import BottomNavigation from "@/components/BottomNavigation";
import QuickTriageButton from "@/components/QuickTriageButton";

const quickTriageOptions = [
  { label: "Headache", icon: Brain },
  { label: "Fever", icon: Thermometer },
  { label: "Cough", icon: Wind },
  { label: "Chest Pain", icon: HeartPulse },
  { label: "Fatigue", icon: Activity },
];

const allSymptoms = [
  "Headache", "Fever", "Cough", "Chest Pain", "Fatigue",
  "Nausea", "Dizziness", "Back Pain", "Shortness of Breath",
  "Sore Throat", "Joint Pain", "Abdominal Pain", "Skin Rash",
  "Anxiety", "Insomnia", "Loss of Appetite", "Muscle Aches",
  "Runny Nose", "Ear Pain", "Eye Problems"
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [showMoreSymptoms, setShowMoreSymptoms] = useState(false);

  const isGuest = !user;

  const triageMutation = useMutation({
    mutationFn: async (data: { symptoms: string; quickTriageTypes: string[] }) => {
      const res = await apiRequest("POST", "/api/triage/analyze", data);
      return await res.json();
    },
    onSuccess: (data: { sessionId: string }) => {
      navigate(`/triage-results/${data.sessionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze symptoms",
        variant: "destructive",
      });
    },
  });

  const handleQuickTriageSelect = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = () => {
    const combinedSymptoms = [
      ...selectedSymptoms,
      symptomDescription
    ].filter(Boolean).join(". ");

    if (!combinedSymptoms.trim()) {
      toast({
        title: "Please describe your symptoms",
        description: "Select quick triage options or describe your symptoms",
        variant: "destructive",
      });
      return;
    }

    triageMutation.mutate({
      symptoms: combinedSymptoms,
      quickTriageTypes: selectedSymptoms,
    });
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Could not log out",
        variant: "destructive",
      });
    }
  };

  const userInitials = user 
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "G";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm" data-testid="user-name">
                {isGuest ? "Guest User" : `${user?.firstName || ""} ${user?.lastName || ""}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGuest ? "Emergency Access" : "Patient"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/vitals")}
              data-testid="button-vitals"
            >
              <Activity className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
            </Button>
            {!isGuest && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Quick Triage Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Quick Triage</h2>
            <Sheet open={showMoreSymptoms} onOpenChange={setShowMoreSymptoms}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-more-symptoms">
                  <MoreHorizontal className="w-4 h-4 mr-1" />
                  More
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh]">
                <SheetHeader>
                  <SheetTitle>All Symptoms</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-full py-4">
                  <div className="grid grid-cols-2 gap-2">
                    {allSymptoms.map((symptom) => (
                      <Button
                        key={symptom}
                        variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleQuickTriageSelect(symptom)}
                        data-testid={`symptom-${symptom.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {symptom}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {quickTriageOptions.map((option) => (
                <QuickTriageButton
                  key={option.label}
                  label={option.label}
                  icon={option.icon}
                  onClick={() => handleQuickTriageSelect(option.label)}
                  isSelected={selectedSymptoms.includes(option.label)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Selected Symptoms */}
          {selectedSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedSymptoms.map((symptom) => (
                <Badge 
                  key={symptom} 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleQuickTriageSelect(symptom)}
                >
                  {symptom} ×
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Symptom Description */}
        <section>
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Describe Your Symptoms</h2>
            <Textarea
              value={symptomDescription}
              onChange={(e) => setSymptomDescription(e.target.value)}
              placeholder="Tell us more about how you're feeling. Include details like when symptoms started, severity, and any other relevant information..."
              className="min-h-[120px] resize-none"
              data-testid="textarea-symptoms"
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {symptomDescription.length} characters
            </p>
          </Card>
        </section>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={triageMutation.isPending}
          className="w-full"
          size="lg"
          data-testid="button-submit-symptoms"
        >
          {triageMutation.isPending ? (
            "Analyzing symptoms..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit for Analysis
            </>
          )}
        </Button>

        {/* Info Card */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            Our AI-powered system will analyze your symptoms and provide triage 
            recommendations. For emergencies, always call <strong className="text-destructive">108</strong>.
          </p>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
}
