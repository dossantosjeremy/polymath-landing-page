import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, PlayCircle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ScheduleConfigurator } from "@/components/ScheduleConfigurator";
import { ScheduleTimeline } from "@/components/ScheduleTimeline";
import { ScheduleRecovery } from "@/components/ScheduleRecovery";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { ScheduleDayAgenda } from "@/components/ScheduleDayAgenda";

interface ScheduleEvent {
  id: string;
  module_index: number;
  step_title: string;
  estimated_minutes: number;
  scheduled_date: string;
  is_done: boolean;
  completed_at: string | null;
}

interface LearningSchedule {
  id: string;
  saved_syllabus_id: string;
  availability: Record<string, number>;
  start_date: string;
  is_active: boolean;
  saved_syllabi: {
    discipline: string;
    modules: any;
  };
  events: ScheduleEvent[];
}

export default function Schedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<LearningSchedule[]>([]);
  const [todayEvents, setTodayEvents] = useState<(ScheduleEvent & { discipline: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());
  const [configuringScheduleId, setConfiguringScheduleId] = useState<string | null>(null);
  const [viewingTimelineId, setViewingTimelineId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);

      const { data: schedulesData, error: schedulesError } = await supabase
        .from("learning_schedules")
        .select(`
          *,
          saved_syllabi (
            discipline,
            modules
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;

      const schedulesWithEvents = await Promise.all(
        (schedulesData || []).map(async (schedule) => {
          const { data: events } = await supabase
            .from("schedule_events")
            .select("*")
            .eq("schedule_id", schedule.id)
            .order("scheduled_date", { ascending: true });

          return {
            ...schedule,
            events: events || [],
          };
        })
      );

      setSchedules(schedulesWithEvents as LearningSchedule[]);

      const today = new Date().toISOString().split("T")[0];
      const allTodayEvents: (ScheduleEvent & { discipline: string })[] = [];

      schedulesWithEvents.forEach((schedule) => {
        const todayScheduleEvents = schedule.events.filter(
          (event) => event.scheduled_date === today
        );
        todayScheduleEvents.forEach((event) => {
          allTodayEvents.push({
            ...event,
            discipline: schedule.saved_syllabi.discipline,
          });
        });
      });

      setTodayEvents(allTodayEvents);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduleExpansion = (scheduleId: string) => {
    setExpandedSchedules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  const markEventComplete = async (eventId: string, isDone: boolean) => {
    try {
      const { error } = await supabase
        .from("schedule_events")
        .update({
          is_done: isDone,
          completed_at: isDone ? new Date().toISOString() : null,
        })
        .eq("id", eventId);

      if (error) throw error;

      await fetchSchedules();
      toast.success(isDone ? "Task completed!" : "Task marked incomplete");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update task");
    }
  };

  const totalTodayMinutes = todayEvents.reduce((sum, event) => sum + event.estimated_minutes, 0);
  const completedTodayMinutes = todayEvents
    .filter((event) => event.is_done)
    .reduce((sum, event) => sum + event.estimated_minutes, 0);

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getScheduleProgress = (schedule: LearningSchedule) => {
    const total = schedule.events.length;
    const completed = schedule.events.filter((e) => e.is_done).length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getAvailabilityDisplay = (availability: Record<string, number>) => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const activeDays = days
      .map((day, idx) => (availability[day] > 0 ? shortDays[idx] : null))
      .filter(Boolean);
    const totalMinutes = Object.values(availability).reduce((sum, mins) => sum + mins, 0);
    const avgMinutes = activeDays.length > 0 ? Math.round(totalMinutes / activeDays.length) : 0;

    return `${activeDays.join(", ")} • ${formatMinutes(avgMinutes)}/day`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading your schedule...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Learning Schedule</h1>
          <p className="text-muted-foreground">
            Plan your learning journey across all saved courses
          </p>
        </div>

        {todayEvents.length > 0 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Focus - {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatMinutes(totalTodayMinutes)} planned • {formatMinutes(completedTodayMinutes)} completed
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                  >
                    <Checkbox
                      checked={event.is_done}
                      onCheckedChange={(checked) => markEventComplete(event.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className={event.is_done ? "line-through text-muted-foreground" : ""}>
                        {event.discipline}: {event.step_title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatMinutes(event.estimated_minutes)} • {event.discipline}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="mt-4 w-full" size="lg">
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Today's Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Calendar and Agenda Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <ScheduleCalendar
              schedules={schedules}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>
          <div className="lg:col-span-2">
            <ScheduleDayAgenda
              selectedDate={selectedDate}
              schedules={schedules}
              onEventComplete={markEventComplete}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No scheduled courses yet</p>
                <Button onClick={() => (window.location.href = "/saved")}>
                  Go to Saved Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => {
                  const progress = getScheduleProgress(schedule);
                  const isExpanded = expandedSchedules.has(schedule.id);
                  const isViewing = viewingTimelineId === schedule.id;

                  return (
                    <div key={schedule.id} className="border rounded-lg">
                      <div
                        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleScheduleExpansion(schedule.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <h3 className="font-semibold text-lg">
                              {schedule.saved_syllabi.discipline}
                            </h3>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {progress.completed}/{progress.total} steps ({progress.percentage}%)
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t pt-4">
                          <div className="text-sm text-muted-foreground">
                            <div>Schedule: {getAvailabilityDisplay(schedule.availability)}</div>
                            <div>Started: {new Date(schedule.start_date).toLocaleDateString()}</div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setViewingTimelineId(isViewing ? null : schedule.id)}
                            >
                              {isViewing ? "Hide Timeline" : "View Timeline"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setConfiguringScheduleId(schedule.id)}
                            >
                              Edit Schedule
                            </Button>
                          </div>

                          {isViewing && (
                            <ScheduleTimeline
                              events={schedule.events}
                              discipline={schedule.saved_syllabi.discipline}
                              onEventComplete={(eventId, isDone) => markEventComplete(eventId, isDone)}
                            />
                          )}

                          <ScheduleRecovery
                            scheduleId={schedule.id}
                            events={schedule.events}
                            onRecalibrate={fetchSchedules}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      {configuringScheduleId && (
        <ScheduleConfigurator
          scheduleId={configuringScheduleId}
          onClose={() => setConfiguringScheduleId(null)}
          onComplete={fetchSchedules}
        />
      )}
    </div>
  );
}
