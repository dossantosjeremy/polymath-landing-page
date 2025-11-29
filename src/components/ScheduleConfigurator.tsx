import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScheduleConfiguratorProps {
  scheduleId: string | null;
  syllabusId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export function ScheduleConfigurator({
  scheduleId,
  syllabusId,
  onClose,
  onComplete,
}: ScheduleConfiguratorProps) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(["monday", "wednesday", "friday"]));
  const [hoursPerDay, setHoursPerDay] = useState([1.5]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState("");
  const [totalSteps, setTotalSteps] = useState(0);

  useEffect(() => {
    if (syllabusId) {
      loadSyllabusInfo(syllabusId);
    } else if (scheduleId) {
      loadExistingSchedule(scheduleId);
    }
  }, [scheduleId, syllabusId]);

  const loadSyllabusInfo = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("saved_syllabi")
        .select("discipline, modules")
        .eq("id", id)
        .single();

      if (error) throw error;

      setDiscipline(data.discipline);
      const modules = JSON.parse(JSON.stringify(data.modules));
      let stepCount = 0;
      modules.forEach((module: any) => {
        stepCount += module.steps?.length || 0;
      });
      setTotalSteps(stepCount);
    } catch (error) {
      console.error("Error loading syllabus:", error);
      toast.error("Failed to load course information");
    }
  };

  const loadExistingSchedule = async (id: string) => {
    try {
      const { data: schedule, error } = await supabase
        .from("learning_schedules")
        .select(`
          *,
          saved_syllabi (
            discipline,
            modules
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setDiscipline(schedule.saved_syllabi.discipline);
      const modules = JSON.parse(JSON.stringify(schedule.saved_syllabi.modules));
      let stepCount = 0;
      modules.forEach((module: any) => {
        stepCount += module.steps?.length || 0;
      });
      setTotalSteps(stepCount);

      const availability = schedule.availability as Record<string, number>;
      const activeDays = Object.keys(availability).filter((day) => availability[day] > 0);
      setSelectedDays(new Set(activeDays));

      const avgMinutes = activeDays.length > 0
        ? Object.values(availability).reduce((sum, mins) => sum + mins, 0) / activeDays.length
        : 90;
      setHoursPerDay([avgMinutes / 60]);

      setStartDate(new Date(schedule.start_date));
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast.error("Failed to load schedule");
    }
  };

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const calculateEstimatedCompletion = () => {
    const totalMinutes = totalSteps * 45;
    const minutesPerWeek = selectedDays.size * (hoursPerDay[0] * 60);
    if (minutesPerWeek === 0) return null;

    const weeksNeeded = Math.ceil(totalMinutes / minutesPerWeek);
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + weeksNeeded * 7);

    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      hoursPerWeek: Math.round(minutesPerWeek / 60 * 10) / 10,
      completionDate,
    };
  };

  const handleGenerate = async () => {
    if (selectedDays.size === 0) {
      toast.error("Please select at least one study day");
      return;
    }

    try {
      setLoading(true);

      const availability: Record<string, number> = {};
      DAYS.forEach((day) => {
        availability[day.key] = selectedDays.has(day.key) ? hoursPerDay[0] * 60 : 0;
      });

      const targetSyllabusId = syllabusId || (scheduleId ? await getScheduleSyllabusId(scheduleId) : null);

      if (!targetSyllabusId) {
        throw new Error("No syllabus ID available");
      }

      const { data: savedSyllabus, error: syllabusError } = await supabase
        .from("saved_syllabi")
        .select("modules, user_id")
        .eq("id", targetSyllabusId)
        .single();

      if (syllabusError) throw syllabusError;

      const { data, error } = await supabase.functions.invoke("generate-schedule", {
        body: {
          saved_syllabus_id: targetSyllabusId,
          availability,
          start_date: format(startDate, "yyyy-MM-dd"),
          modules: savedSyllabus.modules,
          user_id: savedSyllabus.user_id,
          existing_schedule_id: scheduleId,
        },
      });

      if (error) throw error;

      toast.success(scheduleId ? "Schedule updated!" : "Schedule created!");
      onComplete();
      onClose();
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    } finally {
      setLoading(false);
    }
  };

  const getScheduleSyllabusId = async (id: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("learning_schedules")
      .select("saved_syllabus_id")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error getting syllabus ID:", error);
      return null;
    }

    return data.saved_syllabus_id;
  };

  const estimate = calculateEstimatedCompletion();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule: {discipline}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-3 block">Which days can you study?</label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <div
                  key={day.key}
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${
                    selectedDays.has(day.key)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleDay(day.key)}
                >
                  <Checkbox checked={selectedDays.has(day.key)} className="mb-1" />
                  <div className="text-sm font-medium">{day.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">
              Hours per study day: {hoursPerDay[0].toFixed(1)} hours
            </label>
            <Slider
              value={hoursPerDay}
              onValueChange={setHoursPerDay}
              min={0.5}
              max={4}
              step={0.5}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Start date:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
              </PopoverContent>
            </Popover>
          </div>

          {estimate && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Preview:</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• {totalSteps} steps × ~45 min each = ~{estimate.totalHours} hours total</div>
                <div>
                  • At {estimate.hoursPerWeek}h/week → Estimated completion:{" "}
                  {format(estimate.completionDate, "MMMM dd, yyyy")}
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
            {loading ? "Generating..." : scheduleId ? "Update Schedule" : "Generate Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
