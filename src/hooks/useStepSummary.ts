import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export const useStepSummary = () => {
  // Cache summaries by step title to avoid showing same content across steps
  const summaryCache = useRef<Map<string, string>>(new Map());
  const [currentStepTitle, setCurrentStepTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  // Get summary for current step from cache
  const summary = currentStepTitle ? summaryCache.current.get(currentStepTitle) || null : null;

  const generateSummary = useCallback(async (
    stepTitle: string,
    discipline: string,
    stepDescription: string,
    sourceContent: string,
    resources?: any,
    referenceLength: 'brief' | 'standard' | 'comprehensive' = 'standard',
    forceRefresh: boolean = false,
    learningObjective?: string,
    pedagogicalFunction?: string,
    cognitiveLevel?: string,
    narrativePosition?: string,
    evidenceOfMastery?: string
  ) => {
    // Update current step
    setCurrentStepTitle(stepTitle);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && summaryCache.current.has(stepTitle)) {
      console.log('[Summary] Using cached summary for:', stepTitle);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-step-summary', {
        body: {
          stepTitle,
          discipline,
          stepDescription,
          sourceContent,
          resources,
          referenceLength,
          forceRefresh,
          locale: i18n.language,
          learningObjective,
          pedagogicalFunction,
          cognitiveLevel,
          narrativePosition,
          evidenceOfMastery,
        }
      });

      if (functionError) {
        throw functionError;
      }

      // Store in cache
      summaryCache.current.set(stepTitle, data.summary);
      // Force re-render by updating the current step title state
      setCurrentStepTitle(stepTitle);
    } catch (err) {
      console.error('Error generating step summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language]);

  // Clear summary for a specific step (used when step changes)
  const clearSummary = useCallback((stepTitle?: string) => {
    if (stepTitle) {
      summaryCache.current.delete(stepTitle);
    }
    setCurrentStepTitle('');
  }, []);

  return { summary, isLoading, error, generateSummary, clearSummary, currentStepTitle };
};
