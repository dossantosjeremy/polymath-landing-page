import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StepResources {
  primaryVideo: {
    url: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: string;
    whyThisVideo: string;
    keyMoments?: { time: string; label: string }[];
  } | null;
  
  deepReading: {
    url: string;
    domain: string;
    title: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
  } | null;
  
  book: {
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
  } | null;
  
  alternatives: Array<{
    type: 'podcast' | 'mooc' | 'video' | 'article' | 'book';
    url: string;
    title: string;
    source: string;
    duration?: string;
    author?: string;
  }>;
}

export const useStepResources = () => {
  const [resources, setResources] = useState<StepResources | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async (stepTitle: string, discipline: string, syllabusUrls: string[] = [], forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-step-resources', {
        body: { stepTitle, discipline, syllabusUrls, forceRefresh }
      });

      if (functionError) {
        throw functionError;
      }

      setResources(data as StepResources);
    } catch (err) {
      console.error('Error fetching step resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      setResources(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { resources, isLoading, error, fetchResources };
};
