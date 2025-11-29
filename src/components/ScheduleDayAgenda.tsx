import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface ScheduleEvent {
  id: string;
  step_title: string;
  scheduled_date: string;
  is_done: boolean;
  estimated_minutes: number;
}

interface LearningSchedule {
  id: string;
  saved_syllabi: {
    discipline: string;
  };
  events: ScheduleEvent[];
}

interface ScheduleDayAgendaProps {
  selectedDate: Date;
  schedules: LearningSchedule[];
  onEventComplete: (eventId: string, isDone: boolean) => void;
}

const COURSE_COLORS = [
  "hsl(217, 91%, 60%)", // blue
  "hsl(142, 76%, 36%)", // green
  "hsl(38, 92%, 50%)", // amber
  "hsl(0, 84%, 60%)", // red
  "hsl(262, 83%, 58%)", // purple
  "hsl(330, 81%, 60%)", // pink
];

export function ScheduleDayAgenda({ selectedDate, schedules, onEventComplete }: ScheduleDayAgendaProps) {
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const eventsForDay: Array<{
    event: ScheduleEvent;
    discipline: string;
    color: string;
  }> = [];

  schedules.forEach((schedule, scheduleIndex) => {
    const color = COURSE_COLORS[scheduleIndex % COURSE_COLORS.length];
    schedule.events
      .filter((event) => event.scheduled_date === selectedDateStr)
      .forEach((event) => {
        eventsForDay.push({
          event,
          discipline: schedule.saved_syllabi.discipline,
          color,
        });
      });
  });

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const totalMinutes = eventsForDay.reduce((sum, item) => sum + item.event.estimated_minutes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Agenda for {format(selectedDate, "MMMM d, yyyy")}</span>
          {eventsForDay.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatMinutes(totalMinutes)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eventsForDay.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tasks scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventsForDay.map((item) => (
              <div
                key={item.event.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderLeftColor: item.color, borderLeftWidth: "3px" }}
              >
                <Checkbox
                  checked={item.event.is_done}
                  onCheckedChange={(checked) => onEventComplete(item.event.id, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className={item.event.is_done ? "line-through text-muted-foreground" : ""}>
                    <span className="font-medium">{item.discipline}:</span> {item.event.step_title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatMinutes(item.event.estimated_minutes)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
