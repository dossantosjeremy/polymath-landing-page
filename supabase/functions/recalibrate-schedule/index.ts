import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function recalculateEventDates(
  events: any[],
  availability: Record<string, number>,
  startDate: string
): any[] {
  const today = new Date().toISOString().split("T")[0];
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  // Separate completed and pending events
  const completedEvents = events.filter((e) => e.is_done);
  const pendingEvents = events.filter((e) => !e.is_done).sort((a, b) => a.module_index - b.module_index);

  let currentDate = new Date(startDate);
  if (currentDate < new Date(today)) {
    currentDate = new Date(today);
  }

  const updatedPendingEvents = pendingEvents.map((event) => {
    const estimatedMinutes = event.estimated_minutes || 45;

    // Find next available slot
    while (true) {
      const dayName = dayNames[currentDate.getDay()];
      const availableMinutes = availability[dayName] || 0;

      if (availableMinutes >= estimatedMinutes) {
        const scheduledDate = currentDate.toISOString().split("T")[0];
        currentDate.setDate(currentDate.getDate() + 1);

        return {
          ...event,
          scheduled_date: scheduledDate,
        };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return [...completedEvents, ...updatedPendingEvents];
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

    const { schedule_id } = await req.json();

    console.log("Recalibrate schedule request:", { schedule_id });

    // Get the schedule and its events
    const { data: schedule, error: scheduleError } = await supabase
      .from("learning_schedules")
      .select("*")
      .eq("id", schedule_id)
      .single();

    if (scheduleError) throw scheduleError;

    const { data: events, error: eventsError } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("schedule_id", schedule_id)
      .order("module_index", { ascending: true });

    if (eventsError) throw eventsError;

    console.log(`Found ${events.length} events to recalibrate`);

    // Recalculate event dates
    const updatedEvents = recalculateEventDates(
      events,
      schedule.availability as Record<string, number>,
      new Date().toISOString().split("T")[0]
    );

    // Update each event
    for (const event of updatedEvents) {
      const { error: updateError } = await supabase
        .from("schedule_events")
        .update({
          scheduled_date: event.scheduled_date,
        })
        .eq("id", event.id);

      if (updateError) {
        console.error("Error updating event:", event.id, updateError);
      }
    }

    console.log("Schedule recalibrated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        updated_events: updatedEvents.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error recalibrating schedule:", error);
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
