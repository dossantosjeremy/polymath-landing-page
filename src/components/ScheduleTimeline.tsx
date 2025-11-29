import { CheckCircle2, Circle, Award, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleEvent {
  id: string;
  step_title: string;
  scheduled_date: string;
  is_done: boolean;
  estimated_minutes: number;
}

interface ScheduleTimelineProps {
  events: ScheduleEvent[];
  discipline: string;
  onEventComplete: (eventId: string, isDone: boolean) => void;
}

export function ScheduleTimeline({ events, discipline, onEventComplete }: ScheduleTimelineProps) {
  const today = new Date().toISOString().split("T")[0];

  const getEventStatus = (event: ScheduleEvent) => {
    if (event.is_done) return "done";
    if (event.scheduled_date === today) return "today";
    if (event.scheduled_date < today) return "overdue";
    return "future";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isCapstone = (title: string) => {
    return title.toLowerCase().includes("capstone");
  };

  return (
    <div className="mt-4 border rounded-lg p-4 bg-accent/5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Navigation className="h-5 w-5" />
        {discipline} Timeline
      </h3>

      <div className="space-y-4">
        {events.map((event, index) => {
          const status = getEventStatus(event);
          const isMilestone = isCapstone(event.step_title);

          return (
            <div
              key={event.id}
              className={`flex items-start gap-4 ${
                index !== events.length - 1 ? "border-l-2 border-border ml-4 pb-4" : ""
              }`}
            >
              <div className="relative -ml-[17px]">
                {status === "done" ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500 bg-background" />
                ) : status === "today" ? (
                  <div className="h-8 w-8 rounded-full bg-primary animate-pulse flex items-center justify-center">
                    <Circle className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : isMilestone ? (
                  <Award className="h-8 w-8 text-[hsl(var(--gold))] bg-background" />
                ) : (
                  <Circle className={`h-8 w-8 ${status === "overdue" ? "text-destructive" : "text-muted"} bg-background`} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      status === "done" ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {formatDate(event.scheduled_date)}
                  </span>
                  {status === "today" && (
                    <span className="text-xs font-medium text-primary px-2 py-1 rounded-full bg-primary/10">
                      TODAY
                    </span>
                  )}
                  {status === "overdue" && !event.is_done && (
                    <span className="text-xs font-medium text-destructive px-2 py-1 rounded-full bg-destructive/10">
                      OVERDUE
                    </span>
                  )}
                  {status === "future" && (
                    <span className="text-xs text-muted-foreground">Projected</span>
                  )}
                </div>

                <div
                  className={`font-medium mb-2 ${
                    status === "done" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {event.step_title}
                </div>

                {status === "today" && !event.is_done && (
                  <Button size="sm" onClick={() => onEventComplete(event.id, true)}>
                    Mark Complete
                  </Button>
                )}

                {status === "done" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEventComplete(event.id, false)}
                  >
                    Mark Incomplete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
