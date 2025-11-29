-- Add ad-hoc syllabus tracking columns to community_syllabi table
ALTER TABLE community_syllabi 
  ADD COLUMN IF NOT EXISTS is_ad_hoc BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS composition_type TEXT,
  ADD COLUMN IF NOT EXISTS derived_from TEXT[],
  ADD COLUMN IF NOT EXISTS search_term TEXT;

-- Create index for ad-hoc lookups
CREATE INDEX IF NOT EXISTS idx_community_syllabi_is_ad_hoc ON community_syllabi(is_ad_hoc);
CREATE INDEX IF NOT EXISTS idx_community_syllabi_search_term ON community_syllabi(search_term) WHERE search_term IS NOT NULL;