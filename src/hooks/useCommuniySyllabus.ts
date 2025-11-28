import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CommuniySyllabus {
  id: string;
  discipline: string;
  discipline_path: string | null;
  modules: any;
  raw_sources: any;
  source: string;
  created_at: string;
}

export const useCommuniySyllabus = (discipline: string) => {
  const [cachedSyllabus, setCachedSyllabus] = useState<CommuniySyllabus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!discipline) {
      setCachedSyllabus(null);
      return;
    }

    const checkCache = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('community_syllabi')
          .select('*')
          .eq('discipline', discipline)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setCachedSyllabus(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check cache'));
        setCachedSyllabus(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkCache();
  }, [discipline]);

  const cacheDate = cachedSyllabus?.created_at 
    ? new Date(cachedSyllabus.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const sourceCount = cachedSyllabus?.raw_sources 
    ? (Array.isArray(cachedSyllabus.raw_sources) ? cachedSyllabus.raw_sources.length : 0)
    : 0;

  return {
    cachedSyllabus,
    isLoading,
    error,
    cacheDate,
    sourceCount
  };
};
