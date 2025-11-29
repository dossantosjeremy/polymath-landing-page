-- Create learning_schedules table
CREATE TABLE public.learning_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  saved_syllabus_id UUID REFERENCES public.saved_syllabi(id) ON DELETE CASCADE NOT NULL,
  availability JSONB NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, saved_syllabus_id)
);

-- Create schedule_events table
CREATE TABLE public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.learning_schedules(id) ON DELETE CASCADE NOT NULL,
  module_index INTEGER NOT NULL,
  step_title TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 45,
  scheduled_date DATE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.learning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_schedules
CREATE POLICY "Users can manage their own schedules"
ON public.learning_schedules
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for schedule_events
CREATE POLICY "Users can manage their own events"
ON public.schedule_events
FOR ALL
USING (
  schedule_id IN (
    SELECT id FROM public.learning_schedules WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_learning_schedules_updated_at
BEFORE UPDATE ON public.learning_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();