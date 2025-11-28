-- Create community_syllabi table for cross-user syllabus caching
CREATE TABLE IF NOT EXISTS public.community_syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL UNIQUE,
  discipline_path TEXT,
  modules JSONB NOT NULL,
  raw_sources JSONB,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_syllabi ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached syllabi
CREATE POLICY "Anyone can read community syllabi"
ON public.community_syllabi
FOR SELECT
USING (true);

-- System can insert/update cached syllabi (service role only)
CREATE POLICY "System can upsert community syllabi"
ON public.community_syllabi
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_community_syllabi_discipline ON public.community_syllabi(discipline);

COMMENT ON TABLE public.community_syllabi IS 'Cross-user cache of generated syllabi to reduce API costs';
COMMENT ON COLUMN public.community_syllabi.discipline IS 'Unique discipline name used as cache key';
COMMENT ON COLUMN public.community_syllabi.modules IS 'Generated module structure';
COMMENT ON COLUMN public.community_syllabi.raw_sources IS 'Discovered source syllabi with content';