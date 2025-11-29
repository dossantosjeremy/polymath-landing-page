-- Create capstone_assignments table
CREATE TABLE public.capstone_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  assignment_name TEXT NOT NULL,
  source_tier TEXT NOT NULL CHECK (source_tier IN ('extraction', 'oer_search', 'bok_synthesis')),
  source_url TEXT,
  source_label TEXT,
  
  -- The Assignment Content
  scenario TEXT NOT NULL,
  instructions JSONB NOT NULL,
  deliverable_format TEXT,
  estimated_time TEXT,
  
  -- Role/Audience/Format for Bok-synthesized assignments
  role TEXT,
  audience TEXT,
  
  -- Linked Resources
  resource_attachments JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_assignment_per_step UNIQUE(step_title, discipline)
);

-- Enable Row Level Security
ALTER TABLE public.capstone_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (assignments are shared across users)
CREATE POLICY "Anyone can read capstone assignments"
ON public.capstone_assignments
FOR SELECT
USING (true);

-- System can insert/update capstone assignments
CREATE POLICY "System can upsert capstone assignments"
ON public.capstone_assignments
FOR ALL
USING (true)
WITH CHECK (true);