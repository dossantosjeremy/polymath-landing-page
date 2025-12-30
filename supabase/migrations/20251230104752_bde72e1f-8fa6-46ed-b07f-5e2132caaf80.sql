-- Add locale column to community_syllabi for language-specific cached syllabi
ALTER TABLE community_syllabi 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- Add locale column to step_summaries for language-specific summaries
ALTER TABLE step_summaries 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- Add locale column to capstone_assignments for language-specific assignments
ALTER TABLE capstone_assignments 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- Create composite indexes for efficient locale-aware queries
CREATE INDEX IF NOT EXISTS idx_community_syllabi_discipline_locale ON community_syllabi(discipline, locale);
CREATE INDEX IF NOT EXISTS idx_step_summaries_discipline_locale ON step_summaries(step_title, discipline, locale);
CREATE INDEX IF NOT EXISTS idx_capstone_assignments_discipline_locale ON capstone_assignments(step_title, discipline, locale);