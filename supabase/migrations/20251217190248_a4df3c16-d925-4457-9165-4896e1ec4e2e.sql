-- Create table for caching generated discipline images
CREATE TABLE public.discipline_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discipline_name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discipline_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached images
CREATE POLICY "Anyone can read discipline images"
ON public.discipline_images
FOR SELECT
USING (true);

-- System can insert/update images
CREATE POLICY "System can manage discipline images"
ON public.discipline_images
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_discipline_images_name ON public.discipline_images(discipline_name);

-- Create storage bucket for discipline images
INSERT INTO storage.buckets (id, name, public) VALUES ('discipline-images', 'discipline-images', true);

-- Storage policies for discipline images bucket
CREATE POLICY "Anyone can view discipline images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'discipline-images');

CREATE POLICY "System can upload discipline images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'discipline-images');

CREATE POLICY "System can update discipline images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'discipline-images');