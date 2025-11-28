-- Create table to store saved syllabi
CREATE TABLE public.saved_syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  discipline TEXT NOT NULL,
  discipline_path TEXT,
  modules JSONB NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  raw_sources JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_syllabi ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved syllabi"
  ON public.saved_syllabi
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved syllabi"
  ON public.saved_syllabi
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved syllabi"
  ON public.saved_syllabi
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_syllabi_updated_at
  BEFORE UPDATE ON public.saved_syllabi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();