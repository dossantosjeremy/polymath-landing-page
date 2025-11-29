import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleEvent {
  id: string;
  scheduled_date: string;
  is_done: boolean;
}

interface ScheduleRecoveryProps {
  scheduleId: string;
  events: ScheduleEvent[];
  onRecalibrate: () => void;
}

export function ScheduleRecovery({ scheduleId, events, onRecalibrate }: ScheduleRecoveryProps) {
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const overdueEvents = events.filter((event) => !event.is_done && event.scheduled_date < today);

  if (overdueEvents.length === 0) return null;

  const handleRecalibrate = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("recalibrate-schedule", {
        body: { schedule_id: scheduleId },
      });

      if (error) throw error;

      toast.success("Schedule updated! All pending tasks have been rescheduled.");
      onRecalibrate();
    } catch (error) {
      console.error("Error recalibrating schedule:", error);
      toast.error("Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription>
        <div className="mb-3">
          <strong>You're Behind Schedule</strong>
        </div>
        <div className="text-sm mb-3">
          {overdueEvents.length} {overdueEvents.length === 1 ? "session" : "sessions"} from this
          week {overdueEvents.length === 1 ? "is" : "are"} still pending. No worries - learning
          happens at your pace!
        </div>
        <Button
          size="sm"
          onClick={handleRecalibrate}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {loading ? "Updating..." : "Push Schedule Forward"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground mt-2">
          This will move all pending tasks to your next available slots.
        </div>
      </AlertDescription>
    </Alert>
  );
}
