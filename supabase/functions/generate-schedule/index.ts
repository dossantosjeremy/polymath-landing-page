import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleEvent {
  module_index: number;
  step_title: string;
  estimated_minutes: number;
  scheduled_date: string;
  is_done: boolean;
}

function generateCalendarMapping(
  modules: any[],
  availability: Record<string, number>,
  startDate: string
): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  let currentDate = new Date(startDate);

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  let moduleIndex = 0;
  modules.forEach((module) => {
    if (module.steps && Array.isArray(module.steps)) {
      module.steps.forEach((step: any) => {
        const estimatedMinutes = 45; // Default 45 min per step

        // Find next available slot that fits this module
        while (true) {
          const dayName = dayNames[currentDate.getDay()];
          const availableMinutes = availability[dayName] || 0;

          if (availableMinutes >= estimatedMinutes) {
            // This day works - schedule it here
            events.push({
              module_index: moduleIndex,
              step_title: step.title || "Untitled Step",
              estimated_minutes: estimatedMinutes,
              scheduled_date: currentDate.toISOString().split("T")[0],
              is_done: false,
            });

            // Move to next day for next module
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          }

          // Day doesn't work, try next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        moduleIndex++;
      });
    }
  });

  return events;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      saved_syllabus_id,
      availability,
      start_date,
      modules,
      user_id,
      existing_schedule_id,
    } = await req.json();

    console.log("Generate schedule request:", {
      saved_syllabus_id,
      start_date,
      user_id,
      existing_schedule_id,
      module_count: modules?.length,
    });

    // Generate the calendar mapping
    const events = generateCalendarMapping(modules, availability, start_date);

    console.log(`Generated ${events.length} schedule events`);

    // Upsert the schedule
    let scheduleId = existing_schedule_id;

    if (existing_schedule_id) {
      // Update existing schedule
      const { error: updateError } = await supabase
        .from("learning_schedules")
        .update({
          availability,
          start_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing_schedule_id);

      if (updateError) throw updateError;

      // Delete old events
      const { error: deleteError } = await supabase
        .from("schedule_events")
        .delete()
        .eq("schedule_id", existing_schedule_id);

      if (deleteError) throw deleteError;
    } else {
      // Create new schedule
      const { data: newSchedule, error: createError } = await supabase
        .from("learning_schedules")
        .insert({
          user_id,
          saved_syllabus_id,
          availability,
          start_date,
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      scheduleId = newSchedule.id;
    }

    // Insert new events
    const eventsToInsert = events.map((event) => ({
      ...event,
      schedule_id: scheduleId,
    }));

    const { error: eventsError } = await supabase
      .from("schedule_events")
      .insert(eventsToInsert);

    if (eventsError) throw eventsError;

    console.log("Schedule generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        schedule_id: scheduleId,
        events_count: events.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating schedule:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
