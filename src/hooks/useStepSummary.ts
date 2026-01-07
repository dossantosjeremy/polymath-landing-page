import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export const useStepSummary = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  const generateSummary = async (
    stepTitle: string,
    discipline: string,
    stepDescription: string,
    sourceContent: string,
    resources?: any,
    referenceLength: 'brief' | 'standard' | 'comprehensive' = 'standard',
    forceRefresh: boolean = false,
    // NEW: Pedagogical metadata from Course Grammar
    learningObjective?: string,
    pedagogicalFunction?: string,
    cognitiveLevel?: string,
    narrativePosition?: string,
    evidenceOfMastery?: string
  ) => {
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
          // Pass pedagogical metadata
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

      setSummary(data.summary);
    } catch (err) {
      console.error('Error generating step summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { summary, isLoading, error, generateSummary };
};
