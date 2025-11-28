-- Add length column to step_summaries table for tracking reference detail level
ALTER TABLE public.step_summaries 
ADD COLUMN IF NOT EXISTS length TEXT DEFAULT 'standard';

-- Update unique constraint to include length
ALTER TABLE public.step_summaries 
DROP CONSTRAINT IF EXISTS step_summaries_step_title_discipline_key;

ALTER TABLE public.step_summaries 
ADD CONSTRAINT step_summaries_step_title_discipline_length_key 
UNIQUE (step_title, discipline, length);