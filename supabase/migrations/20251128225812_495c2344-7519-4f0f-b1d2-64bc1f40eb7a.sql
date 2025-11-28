-- Create step_summaries table for caching AI-generated teaching references
CREATE TABLE IF NOT EXISTS public.step_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(step_title, discipline)
);

-- Enable RLS
ALTER TABLE public.step_summaries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached summaries
CREATE POLICY "Anyone can read cached summaries"
ON public.step_summaries
FOR SELECT
USING (true);

-- System can insert/update cached summaries
CREATE POLICY "System can upsert cached summaries"
ON public.step_summaries
FOR ALL
USING (true)
WITH CHECK (true);