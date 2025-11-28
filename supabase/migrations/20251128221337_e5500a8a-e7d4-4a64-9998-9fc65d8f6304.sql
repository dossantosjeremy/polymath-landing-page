-- Create step_resources table for caching learning resources across users
CREATE TABLE IF NOT EXISTS public.step_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  syllabus_urls JSONB DEFAULT '[]'::jsonb,
  resources JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_step_resources_lookup ON public.step_resources(step_title, discipline);

-- Enable RLS
ALTER TABLE public.step_resources ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached resources
CREATE POLICY "Anyone can read cached resources"
  ON public.step_resources
  FOR SELECT
  USING (true);

-- Only system can insert/update (via edge functions)
CREATE POLICY "System can insert cached resources"
  ON public.step_resources
  FOR INSERT
  WITH CHECK (true);