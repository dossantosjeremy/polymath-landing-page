import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

interface ScheduleCalendarProps {
  schedules: LearningSchedule[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const COURSE_COLORS = [
  "hsl(217, 91%, 60%)", // blue
  "hsl(142, 76%, 36%)", // green
  "hsl(38, 92%, 50%)", // amber
  "hsl(0, 84%, 60%)", // red
  "hsl(262, 83%, 58%)", // purple
  "hsl(330, 81%, 60%)", // pink
];

export function ScheduleCalendar({ schedules, onDateSelect, selectedDate }: ScheduleCalendarProps) {
  // Build a map of dates with events
  const dateEventMap = new Map<string, { color: string; count: number }[]>();

  schedules.forEach((schedule, scheduleIndex) => {
    const color = COURSE_COLORS[scheduleIndex % COURSE_COLORS.length];

    schedule.events.forEach((event) => {
      const dateKey = event.scheduled_date;
      if (!dateEventMap.has(dateKey)) {
        dateEventMap.set(dateKey, []);
      }
      const existing = dateEventMap.get(dateKey)!.find((e) => e.color === color);
      if (existing) {
        existing.count++;
      } else {
        dateEventMap.get(dateKey)!.push({ color, count: 1 });
      }
    });
  });

  const datesWithEvents = Array.from(dateEventMap.keys()).map((dateStr) => new Date(dateStr));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          modifiers={{ hasEvents: datesWithEvents }}
          modifiersClassNames={{
            hasEvents: "font-bold relative",
          }}
          components={{
            DayContent: ({ date }) => {
              const dateKey = date.toISOString().split("T")[0];
              const events = dateEventMap.get(dateKey);

              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  {date.getDate()}
                  {events && events.length > 0 && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {events.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          }}
          className="pointer-events-auto"
        />
      </CardContent>
    </Card>
  );
}
