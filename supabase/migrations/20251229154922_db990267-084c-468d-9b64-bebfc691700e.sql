-- Enable pg_trgm extension for trigram similarity searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index for faster fuzzy matching on disciplines
CREATE INDEX IF NOT EXISTS idx_disciplines_l1_trgm ON disciplines USING gin (l1 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_disciplines_l2_trgm ON disciplines USING gin (l2 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_disciplines_l3_trgm ON disciplines USING gin (l3 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_disciplines_l4_trgm ON disciplines USING gin (l4 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_disciplines_l5_trgm ON disciplines USING gin (l5 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_disciplines_l6_trgm ON disciplines USING gin (l6 gin_trgm_ops);

-- Create fuzzy search function with 3-step cascade: exact match first, then fuzzy
CREATE OR REPLACE FUNCTION search_disciplines_fuzzy(
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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  search_lower TEXT := LOWER(search_term);
BEGIN
  RETURN QUERY
  -- Step 1: Exact matches (highest priority)
  SELECT 
    d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6, 
    'exact'::TEXT as match_type, 
    1.0::FLOAT as similarity_score
  FROM disciplines d
  WHERE 
    LOWER(COALESCE(d.l1,'')) ILIKE '%' || search_lower || '%' OR
    LOWER(COALESCE(d.l2,'')) ILIKE '%' || search_lower || '%' OR
    LOWER(COALESCE(d.l3,'')) ILIKE '%' || search_lower || '%' OR
    LOWER(COALESCE(d.l4,'')) ILIKE '%' || search_lower || '%' OR
    LOWER(COALESCE(d.l5,'')) ILIKE '%' || search_lower || '%' OR
    LOWER(COALESCE(d.l6,'')) ILIKE '%' || search_lower || '%'
  
  UNION ALL
  
  -- Step 2: Fuzzy matches using trigram similarity (only for non-exact matches)
  SELECT 
    d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
    'fuzzy'::TEXT as match_type,
    GREATEST(
      similarity(LOWER(COALESCE(d.l1,'')), search_lower),
      similarity(LOWER(COALESCE(d.l2,'')), search_lower),
      similarity(LOWER(COALESCE(d.l3,'')), search_lower),
      similarity(LOWER(COALESCE(d.l4,'')), search_lower),
      similarity(LOWER(COALESCE(d.l5,'')), search_lower),
      similarity(LOWER(COALESCE(d.l6,'')), search_lower)
    )::FLOAT as similarity_score
  FROM disciplines d
  WHERE d.id NOT IN (
    -- Exclude exact matches
    SELECT d2.id FROM disciplines d2
    WHERE 
      LOWER(COALESCE(d2.l1,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l2,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l3,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l4,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l5,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l6,'')) ILIKE '%' || search_lower || '%'
  )
  AND GREATEST(
    similarity(LOWER(COALESCE(d.l1,'')), search_lower),
    similarity(LOWER(COALESCE(d.l2,'')), search_lower),
    similarity(LOWER(COALESCE(d.l3,'')), search_lower),
    similarity(LOWER(COALESCE(d.l4,'')), search_lower),
    similarity(LOWER(COALESCE(d.l5,'')), search_lower),
    similarity(LOWER(COALESCE(d.l6,'')), search_lower)
  ) >= similarity_threshold
  
  ORDER BY match_type ASC, similarity_score DESC
  LIMIT 50;
END;
$$;