import { useState, useCallback, useRef, useEffect } from 'react';
import { useResourceCache } from '@/contexts/ResourceCacheContext';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundLoaderState {
  isLoading: boolean;
  progress: number;
  total: number;
  currentStep: string | null;
  completedSteps: string[];
  failedSteps: string[];
}

interface UseBackgroundResourceLoaderProps {
  discipline: string;
  syllabusUrls: string[];
  rawSourcesContent?: string;
  userTimeBudget?: number;
}

export function useBackgroundResourceLoader({
  discipline,
  syllabusUrls,
  rawSourcesContent = '',
  userTimeBudget,
}: UseBackgroundResourceLoaderProps) {
  const { hasResource, setResource } = useResourceCache();
  const [state, setState] = useState<BackgroundLoaderState>({
    isLoading: false,
    progress: 0,
    total: 0,
    currentStep: null,
    completedSteps: [],
    failedSteps: [],
  });
  
  const abortRef = useRef(false);
  const loadingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const loadResourcesForSteps = useCallback(async (stepTitles: string[]) => {
    if (loadingRef.current) return;
    
    // Filter out already cached steps
    const stepsToLoad = stepTitles.filter(title => !hasResource(title));
    
    if (stepsToLoad.length === 0) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: stepTitles.length,
        total: stepTitles.length,
        completedSteps: stepTitles,
      }));
      return;
    }
    
    loadingRef.current = true;
    abortRef.current = false;
    
    setState({
      isLoading: true,
      progress: stepTitles.length - stepsToLoad.length,
      total: stepTitles.length,
      currentStep: stepsToLoad[0],
      completedSteps: stepTitles.filter(t => hasResource(t)),
      failedSteps: [],
    });
    
    const completed: string[] = [...stepTitles.filter(t => hasResource(t))];
    const failed: string[] = [];
    
    // Track used video URLs across all steps to avoid duplicates
    const usedVideoUrls: string[] = [];
    
    for (let i = 0; i < stepsToLoad.length; i++) {
      if (abortRef.current) break;
      
      const stepTitle = stepsToLoad[i];
      
      setState(prev => ({
        ...prev,
        currentStep: stepTitle,
        progress: completed.length,
      }));
      
      try {
        // Add delay between requests to avoid rate limiting (1 second)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (abortRef.current) break;
        
        // Fetch resources for this step, passing used video URLs to avoid duplicates
        const { data, error } = await supabase.functions.invoke('fetch-step-resources', {
          body: {
            stepTitle,
            discipline,
            syllabusUrls,
            rawSourcesContent,
            userTimeBudget,
            isCapstone: false,
            usedVideoUrls, // Pass used URLs to avoid duplicates
          },
        });
        
        if (error) throw error;
        
        if (data && !abortRef.current) {
          setResource(stepTitle, data);
          completed.push(stepTitle);
          
          // Track the core video URL if it exists
          if (data.coreVideo?.url) {
            usedVideoUrls.push(data.coreVideo.url);
          }
        }
      } catch (err) {
        console.error(`[Background Loader] Failed to load resources for "${stepTitle}":`, err);
        failed.push(stepTitle);
      }
      
      setState(prev => ({
        ...prev,
        progress: completed.length,
        completedSteps: [...completed],
        failedSteps: [...failed],
      }));
    }
    
    loadingRef.current = false;
    setState(prev => ({
      ...prev,
      isLoading: false,
      currentStep: null,
    }));
  }, [discipline, syllabusUrls, rawSourcesContent, userTimeBudget, hasResource, setResource]);

  const stopLoading = useCallback(() => {
    abortRef.current = true;
    loadingRef.current = false;
    setState(prev => ({
      ...prev,
      isLoading: false,
      currentStep: null,
    }));
  }, []);

  return {
    ...state,
    loadResourcesForSteps,
    stopLoading,
  };
}
