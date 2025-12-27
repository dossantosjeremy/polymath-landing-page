-- Add topic_pillars and narrative_flow columns to community_syllabi
ALTER TABLE public.community_syllabi 
ADD COLUMN IF NOT EXISTS topic_pillars JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS narrative_flow TEXT DEFAULT NULL;

-- Add topic_pillars and narrative_flow columns to saved_syllabi
ALTER TABLE public.saved_syllabi 
ADD COLUMN IF NOT EXISTS topic_pillars JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS narrative_flow TEXT DEFAULT NULL;