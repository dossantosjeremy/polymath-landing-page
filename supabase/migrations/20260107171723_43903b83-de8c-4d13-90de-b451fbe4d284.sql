-- Drop the old unique constraint that doesn't include locale
ALTER TABLE public.step_summaries DROP CONSTRAINT IF EXISTS step_summaries_step_title_discipline_length_key;

-- Create new unique constraint that includes locale
ALTER TABLE public.step_summaries ADD CONSTRAINT step_summaries_step_title_discipline_length_locale_key 
  UNIQUE (step_title, discipline, length, locale);