import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useStepSummary = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async (
    stepTitle: string,
    discipline: string,
    stepDescription: string,
    sourceContent: string,
    resources?: any,
    forceRefresh: boolean = false
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
          forceRefresh,
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
