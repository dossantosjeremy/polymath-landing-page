-- Create reported_links table for crowdsourced link quality tracking
CREATE TABLE public.reported_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL,
  step_title TEXT,
  discipline TEXT,
  reported_by UUID REFERENCES public.profiles(id),
  report_reason TEXT,
  report_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on url for fast lookups
CREATE INDEX idx_reported_links_url ON public.reported_links(url);
CREATE INDEX idx_reported_links_discipline ON public.reported_links(discipline);

-- Enable RLS
ALTER TABLE public.reported_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read reported links (to filter them out)
CREATE POLICY "Anyone can read reported links"
ON public.reported_links
FOR SELECT
USING (true);

-- Authenticated users can report links
CREATE POLICY "Authenticated users can insert reported links"
ON public.reported_links
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update report counts
CREATE POLICY "Authenticated users can update reported links"
ON public.reported_links
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_reported_links_updated_at
BEFORE UPDATE ON public.reported_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();