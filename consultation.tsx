import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Stethoscope, 
  Calendar,
  Clock,
  CheckCircle2,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const consultationTypes = [
  {
    id: "chronic_care",
    label: "Chronic Care Review",
    description: "Regular check-up for ongoing conditions",
    icon: Stethoscope,
  },
  {
    id: "urgent",
    label: "Urgent Consultation",
    description: "For concerning symptoms that need quick attention",
    icon: Clock,
  },
  {
    id: "follow_up",
    label: "Follow-up Visit",
    description: "Continue discussion from previous triage",
    icon: Calendar,
  },
];

export default function Consultation() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedType, setSelectedType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/consultations", {
        consultationType: selectedType,
        notes: notes,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      setIsBooked(true);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Could not book consultation",
        variant: "destructive",
      });
    },
  });

  const handleBook = () => {
    if (!selectedType) {
      toast({
        title: "Please select a consultation type",
        variant: "destructive",
      });
      return;
    }
    bookMutation.mutate();
  };

  if (isBooked) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Consultation Booked</h1>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8 space-y-6">
          {/* Success */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold" data-testid="booking-success">
              Consultation Requested!
            </h2>
            <p className="text-muted-foreground mt-2">
              Your care team will contact you shortly
            </p>
          </div>

          {/* Summary */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Booking Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>
                  {consultationTypes.find(t => t.id === selectedType)?.label}
                </span>
              </div>
              {notes && (
                <div>
                  <p className="text-muted-foreground">Additional Notes:</p>
                  <p>{notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Button
            className="w-full"
            onClick={() => navigate("/dashboard")}
            data-testid="button-home"
          >
            Back to Home
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Book Consultation</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Intro */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Chronic Care Team</h3>
              <p className="text-xs text-muted-foreground">
                Connect with your dedicated healthcare providers
              </p>
            </div>
          </div>
        </Card>

        {/* Consultation Type Selection */}
        <div>
          <h2 className="font-semibold mb-4">Select Consultation Type</h2>
          <RadioGroup 
            value={selectedType} 
            onValueChange={setSelectedType}
            className="space-y-3"
          >
            {consultationTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Label
                  key={type.id}
                  htmlFor={type.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedType === type.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                >
                  <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Notes */}
        <div>
          <h2 className="font-semibold mb-3">Additional Notes (Optional)</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific concerns or topics you'd like to discuss..."
            className="min-h-[100px] resize-none"
            data-testid="textarea-notes"
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleBook}
          disabled={!selectedType || bookMutation.isPending}
          data-testid="button-book"
        >
          {bookMutation.isPending ? "Booking..." : "Request Consultation"}
        </Button>
      </main>
    </div>
  );
}
