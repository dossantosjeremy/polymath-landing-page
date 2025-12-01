import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StepResources {
  // Updated to support multiple videos
  videos: Array<{
    url: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: string;
    whyThisVideo: string;
    keyMoments?: { time: string; label: string }[];
    verified?: boolean;
    archivedUrl?: string;
  }>;
  
  // Updated to support multiple readings with embedded content
  readings: Array<{
    url: string;
    domain: string;
    title: string;
    author?: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
    embeddedContent?: string;
    contentExtractionStatus?: 'success' | 'partial' | 'failed';
    specificReadings?: Array<{
      citation: string;
      url: string;
      type: 'pdf' | 'article' | 'chapter' | 'external';
      verified?: boolean;
      archivedUrl?: string;
    }>;
    verified?: boolean;
    archivedUrl?: string;
    directPdfUrl?: string;
  }>;
  
  // Updated to support multiple books
  books: Array<{
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
    verified?: boolean;
    archivedUrl?: string;
    embeddedContent?: string;
    isPublicDomain?: boolean;
  }>;
  
  alternatives: Array<{
    type: 'podcast' | 'mooc' | 'video' | 'article' | 'book';
    url: string;
    title: string;
    source: string;
    duration?: string;
    author?: string;
    verified?: boolean;
    archivedUrl?: string;
  }>;

  // Legacy fields for backward compatibility (deprecated)
  primaryVideo?: {
    url: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: string;
    whyThisVideo: string;
    keyMoments?: { time: string; label: string }[];
    verified?: boolean;
    archivedUrl?: string;
  } | null;
  
  deepReading?: {
    url: string;
    domain: string;
    title: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
    specificReadings?: Array<{
      citation: string;
      url: string;
      type: 'pdf' | 'article' | 'chapter' | 'external';
      verified?: boolean;
      archivedUrl?: string;
    }>;
    verified?: boolean;
    archivedUrl?: string;
    directPdfUrl?: string;
  } | null;
  
  book?: {
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
    verified?: boolean;
    archivedUrl?: string;
  } | null;
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
