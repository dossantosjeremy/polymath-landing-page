import { CheckCircle2, Circle, Award, Lock } from "lucide-react";
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
    <div className="mt-4 border rounded-lg p-6 bg-card">
      <h3 className="font-semibold mb-6 text-lg">
        {discipline} Metro Map
      </h3>

      {/* Metro Map Container with continuous line */}
      <div className="relative pl-8">
        {/* Continuous vertical metro line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {events.map((event, index) => {
            const status = getEventStatus(event);
            const isMilestone = isCapstone(event.step_title);

            return (
              <div key={event.id} className="relative">
                {/* Station Node */}
                <div className="absolute -left-8 top-2 z-10">
                  {status === "done" ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  ) : status === "today" ? (
                    <div className="w-8 h-8 rounded-full bg-primary animate-pulse flex items-center justify-center shadow-lg ring-4 ring-primary/20">
                      <Circle className="h-5 w-5 text-primary-foreground fill-current" />
                    </div>
                  ) : isMilestone ? (
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center shadow-lg">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                  ) : status === "overdue" ? (
                    <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                      <Circle className="h-5 w-5 text-destructive-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center shadow">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Station Card */}
                <div
                  className={`ml-4 p-4 rounded-lg border-2 transition-all ${
                    status === "done"
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                      : status === "today"
                      ? "bg-primary/5 border-primary shadow-lg"
                      : status === "overdue"
                      ? "bg-destructive/5 border-destructive/50"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {status === "today" && (
                          <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                            NOW
                          </span>
                        )}
                        {status === "overdue" && !event.is_done && (
                          <span className="text-xs font-bold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">
                            OVERDUE
                          </span>
                        )}
                        {status === "future" && (
                          <span className="text-xs text-muted-foreground font-medium">
                            Due: {formatDate(event.scheduled_date)}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`font-semibold mb-1 ${
                          status === "done" ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {event.step_title}
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.scheduled_date)} • {event.estimated_minutes} min
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {status === "today" && !event.is_done && (
                      <Button size="sm" onClick={() => onEventComplete(event.id, true)}>
                        Complete
                      </Button>
                    )}

                    {status === "done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEventComplete(event.id, false)}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
