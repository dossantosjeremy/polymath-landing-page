-- Add sources_confirmed column to saved_syllabi for epistemic gating
ALTER TABLE public.saved_syllabi ADD COLUMN IF NOT EXISTS sources_confirmed BOOLEAN DEFAULT false;