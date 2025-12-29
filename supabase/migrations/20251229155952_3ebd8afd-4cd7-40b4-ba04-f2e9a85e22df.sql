-- Drop existing function first
DROP FUNCTION IF EXISTS search_disciplines_fuzzy(TEXT, FLOAT);

-- Create improved fuzzy search function with word-prefix matching
CREATE OR REPLACE FUNCTION search_disciplines_fuzzy(
  search_term TEXT, 
  similarity_threshold FLOAT DEFAULT 0.25
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
  search_lower TEXT := LOWER(TRIM(search_term));
BEGIN
  RETURN QUERY
  -- Step 1: Exact substring matches (highest priority)
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
  
  -- Step 2: Word-prefix matches (e.g., "Bible" matches "Biblical")
  SELECT 
    d.id, d.l1, d.l2, d.l3, d.l4, d.l5, d.l6,
    'prefix'::TEXT as match_type,
    0.85::FLOAT as similarity_score
  FROM disciplines d
  WHERE d.id NOT IN (
    SELECT d2.id FROM disciplines d2
    WHERE 
      LOWER(COALESCE(d2.l1,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l2,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l3,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l4,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l5,'')) ILIKE '%' || search_lower || '%' OR
      LOWER(COALESCE(d2.l6,'')) ILIKE '%' || search_lower || '%'
  )
  AND (
    -- Check if any word in any level starts with the search term
    LOWER(COALESCE(d.l1,'')) ~ ('(^|[^a-z])' || search_lower) OR
    LOWER(COALESCE(d.l2,'')) ~ ('(^|[^a-z])' || search_lower) OR
    LOWER(COALESCE(d.l3,'')) ~ ('(^|[^a-z])' || search_lower) OR
    LOWER(COALESCE(d.l4,'')) ~ ('(^|[^a-z])' || search_lower) OR
    LOWER(COALESCE(d.l5,'')) ~ ('(^|[^a-z])' || search_lower) OR
    LOWER(COALESCE(d.l6,'')) ~ ('(^|[^a-z])' || search_lower)
  )
  
  UNION ALL
  
  -- Step 3: Trigram similarity on individual levels (check each separately for better matching)
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
  AND d.id NOT IN (
    -- Exclude prefix matches
    SELECT d3.id FROM disciplines d3
    WHERE 
      LOWER(COALESCE(d3.l1,'')) ~ ('(^|[^a-z])' || search_lower) OR
      LOWER(COALESCE(d3.l2,'')) ~ ('(^|[^a-z])' || search_lower) OR
      LOWER(COALESCE(d3.l3,'')) ~ ('(^|[^a-z])' || search_lower) OR
      LOWER(COALESCE(d3.l4,'')) ~ ('(^|[^a-z])' || search_lower) OR
      LOWER(COALESCE(d3.l5,'')) ~ ('(^|[^a-z])' || search_lower) OR
      LOWER(COALESCE(d3.l6,'')) ~ ('(^|[^a-z])' || search_lower)
  )
  AND GREATEST(
    similarity(LOWER(COALESCE(d.l1,'')), search_lower),
    similarity(LOWER(COALESCE(d.l2,'')), search_lower),
    similarity(LOWER(COALESCE(d.l3,'')), search_lower),
    similarity(LOWER(COALESCE(d.l4,'')), search_lower),
    similarity(LOWER(COALESCE(d.l5,'')), search_lower),
    similarity(LOWER(COALESCE(d.l6,'')), search_lower)
  ) >= similarity_threshold
  
  ORDER BY 
    CASE match_type 
      WHEN 'exact' THEN 1 
      WHEN 'prefix' THEN 2 
      WHEN 'fuzzy' THEN 3 
    END,
    similarity_score DESC
  LIMIT 50;
END;
$$;