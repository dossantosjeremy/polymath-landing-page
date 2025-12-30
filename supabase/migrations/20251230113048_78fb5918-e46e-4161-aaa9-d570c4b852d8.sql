-- Create Spanish disciplines table
CREATE TABLE public.disciplines_es (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  l1 TEXT NOT NULL,
  l2 TEXT,
  l3 TEXT,
  l4 TEXT,
  l5 TEXT,
  l6 TEXT,
  search_text TEXT
);

-- Create French disciplines table  
CREATE TABLE public.disciplines_fr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  l1 TEXT NOT NULL,
  l2 TEXT,
  l3 TEXT,
  l4 TEXT,
  l5 TEXT,
  l6 TEXT,
  search_text TEXT
);

-- Enable RLS
ALTER TABLE public.disciplines_es ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines_fr ENABLE ROW LEVEL SECURITY;

-- RLS policies for Spanish disciplines
CREATE POLICY "Anyone can view disciplines_es" ON public.disciplines_es FOR SELECT USING (true);
CREATE POLICY "Anyone can insert disciplines_es" ON public.disciplines_es FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete disciplines_es" ON public.disciplines_es FOR DELETE USING (true);

-- RLS policies for French disciplines
CREATE POLICY "Anyone can view disciplines_fr" ON public.disciplines_fr FOR SELECT USING (true);
CREATE POLICY "Anyone can insert disciplines_fr" ON public.disciplines_fr FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete disciplines_fr" ON public.disciplines_fr FOR DELETE USING (true);

-- Add trigram indexes for fuzzy search
CREATE INDEX idx_disciplines_es_search ON public.disciplines_es USING gin(search_text gin_trgm_ops);
CREATE INDEX idx_disciplines_fr_search ON public.disciplines_fr USING gin(search_text gin_trgm_ops);

-- Add prefix indexes for efficient prefix matching
CREATE INDEX idx_disciplines_es_l1 ON public.disciplines_es(l1);
CREATE INDEX idx_disciplines_es_l2 ON public.disciplines_es(l2);
CREATE INDEX idx_disciplines_es_l3 ON public.disciplines_es(l3);
CREATE INDEX idx_disciplines_fr_l1 ON public.disciplines_fr(l1);
CREATE INDEX idx_disciplines_fr_l2 ON public.disciplines_fr(l2);
CREATE INDEX idx_disciplines_fr_l3 ON public.disciplines_fr(l3);

-- Create fuzzy search functions for Spanish
CREATE OR REPLACE FUNCTION public.search_disciplines_es_fuzzy(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  l1 TEXT,
  l2 TEXT,
  l3 TEXT,
  l4 TEXT,
  l5 TEXT,
  l6 TEXT,
  match_type TEXT,
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH prefix_matches AS (
    SELECT 
      d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
      'prefix'::TEXT as match_type,
      1.0::FLOAT as similarity_score
    FROM disciplines_es d
    WHERE 
      d.l1 ILIKE search_term || '%' OR
      d.l2 ILIKE search_term || '%' OR
      d.l3 ILIKE search_term || '%' OR
      d.l4 ILIKE search_term || '%' OR
      d.l5 ILIKE search_term || '%' OR
      d.l6 ILIKE search_term || '%'
  ),
  trigram_matches AS (
    SELECT 
      d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
      'trigram'::TEXT as match_type,
      similarity(d.search_text, search_term)::FLOAT as similarity_score
    FROM disciplines_es d
    WHERE 
      d.search_text % search_term
      AND similarity(d.search_text, search_term) >= similarity_threshold
      AND d.id NOT IN (SELECT pm.id FROM prefix_matches pm)
  )
  SELECT * FROM prefix_matches
  UNION ALL
  SELECT * FROM trigram_matches
  ORDER BY similarity_score DESC;
END;
$$;

-- Create fuzzy search functions for French
CREATE OR REPLACE FUNCTION public.search_disciplines_fr_fuzzy(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  l1 TEXT,
  l2 TEXT,
  l3 TEXT,
  l4 TEXT,
  l5 TEXT,
  l6 TEXT,
  match_type TEXT,
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH prefix_matches AS (
    SELECT 
      d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
      'prefix'::TEXT as match_type,
      1.0::FLOAT as similarity_score
    FROM disciplines_fr d
    WHERE 
      d.l1 ILIKE search_term || '%' OR
      d.l2 ILIKE search_term || '%' OR
      d.l3 ILIKE search_term || '%' OR
      d.l4 ILIKE search_term || '%' OR
      d.l5 ILIKE search_term || '%' OR
      d.l6 ILIKE search_term || '%'
  ),
  trigram_matches AS (
    SELECT 
      d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
      'trigram'::TEXT as match_type,
      similarity(d.search_text, search_term)::FLOAT as similarity_score
    FROM disciplines_fr d
    WHERE 
      d.search_text % search_term
      AND similarity(d.search_text, search_term) >= similarity_threshold
      AND d.id NOT IN (SELECT pm.id FROM prefix_matches pm)
  )
  SELECT * FROM prefix_matches
  UNION ALL
  SELECT * FROM trigram_matches
  ORDER BY similarity_score DESC;
END;
$$;