-- Resolve PostgREST ambiguity by removing overloaded signatures and recreating a single function signature.

DROP FUNCTION IF EXISTS public.search_disciplines_fuzzy(search_term text, similarity_threshold numeric);
DROP FUNCTION IF EXISTS public.search_disciplines_fuzzy(search_term text, similarity_threshold double precision);

CREATE OR REPLACE FUNCTION public.search_disciplines_fuzzy(
  search_term text,
  similarity_threshold double precision DEFAULT 0.25
)
RETURNS TABLE (
  id uuid,
  l1 text,
  l2 text,
  l3 text,
  l4 text,
  l5 text,
  l6 text,
  match_type text,
  similarity_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_lower text := lower(trim(search_term));
BEGIN
  RETURN QUERY
  WITH matches AS (
    -- Exact substring match
    SELECT 
      d.id,
      d.l1,
      d.l2,
      d.l3,
      d.l4,
      d.l5,
      d.l6,
      'exact'::text AS match_type,
      1.0::double precision AS similarity_score
    FROM disciplines d
    WHERE 
      lower(d.l1) LIKE '%' || search_lower || '%'
      OR lower(COALESCE(d.l2, '')) LIKE '%' || search_lower || '%'
      OR lower(COALESCE(d.l3, '')) LIKE '%' || search_lower || '%'
      OR lower(COALESCE(d.l4, '')) LIKE '%' || search_lower || '%'
      OR lower(COALESCE(d.l5, '')) LIKE '%' || search_lower || '%'
      OR lower(COALESCE(d.l6, '')) LIKE '%' || search_lower || '%'

    UNION ALL

    -- Prefix match (word starts with search term)
    SELECT 
      d.id,
      d.l1,
      d.l2,
      d.l3,
      d.l4,
      d.l5,
      d.l6,
      'prefix'::text AS match_type,
      0.9::double precision AS similarity_score
    FROM disciplines d
    WHERE 
      lower(d.l1) ~ ('(^|[^a-z])' || search_lower)
      OR lower(COALESCE(d.l2, '')) ~ ('(^|[^a-z])' || search_lower)
      OR lower(COALESCE(d.l3, '')) ~ ('(^|[^a-z])' || search_lower)
      OR lower(COALESCE(d.l4, '')) ~ ('(^|[^a-z])' || search_lower)
      OR lower(COALESCE(d.l5, '')) ~ ('(^|[^a-z])' || search_lower)
      OR lower(COALESCE(d.l6, '')) ~ ('(^|[^a-z])' || search_lower)

    UNION ALL

    -- Trigram fuzzy match on full strings and first tokens
    SELECT 
      d.id,
      d.l1,
      d.l2,
      d.l3,
      d.l4,
      d.l5,
      d.l6,
      'fuzzy'::text AS match_type,
      GREATEST(
        similarity(search_lower, lower(d.l1)),
        similarity(search_lower, lower(COALESCE(d.l2, ''))),
        similarity(search_lower, lower(COALESCE(d.l3, ''))),
        similarity(search_lower, lower(COALESCE(d.l4, ''))),
        similarity(search_lower, lower(COALESCE(d.l5, ''))),
        similarity(search_lower, lower(COALESCE(d.l6, ''))),
        similarity(search_lower, split_part(lower(d.l1), ' ', 1)),
        similarity(search_lower, split_part(lower(COALESCE(d.l2, '')), ' ', 1)),
        similarity(search_lower, split_part(lower(COALESCE(d.l3, '')), ' ', 1)),
        similarity(search_lower, split_part(lower(COALESCE(d.l4, '')), ' ', 1)),
        similarity(search_lower, split_part(lower(COALESCE(d.l5, '')), ' ', 1)),
        similarity(search_lower, split_part(lower(COALESCE(d.l6, '')), ' ', 1))
      )::double precision AS similarity_score
    FROM disciplines d
    WHERE 
      similarity(search_lower, lower(d.l1)) >= similarity_threshold
      OR similarity(search_lower, lower(COALESCE(d.l2, ''))) >= similarity_threshold
      OR similarity(search_lower, lower(COALESCE(d.l3, ''))) >= similarity_threshold
      OR similarity(search_lower, lower(COALESCE(d.l4, ''))) >= similarity_threshold
      OR similarity(search_lower, lower(COALESCE(d.l5, ''))) >= similarity_threshold
      OR similarity(search_lower, lower(COALESCE(d.l6, ''))) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(d.l1), ' ', 1)) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(COALESCE(d.l2, '')), ' ', 1)) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(COALESCE(d.l3, '')), ' ', 1)) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(COALESCE(d.l4, '')), ' ', 1)) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(COALESCE(d.l5, '')), ' ', 1)) >= similarity_threshold
      OR similarity(search_lower, split_part(lower(COALESCE(d.l6, '')), ' ', 1)) >= similarity_threshold
  )
  SELECT DISTINCT ON (m.id)
    m.id,
    m.l1,
    m.l2,
    m.l3,
    m.l4,
    m.l5,
    m.l6,
    m.match_type,
    m.similarity_score
  FROM matches m
  ORDER BY m.id,
    CASE m.match_type 
      WHEN 'exact' THEN 1 
      WHEN 'prefix' THEN 2 
      WHEN 'fuzzy' THEN 3 
      ELSE 9
    END,
    m.similarity_score DESC;
END;
$$;