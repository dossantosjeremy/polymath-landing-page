import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PodcastResource {
  url: string;
  title: string;
  source: string;
}

export const usePodcastLinkRecovery = (podcast: PodcastResource | null) => {
  const [recoveredUrl, setRecoveredUrl] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (!podcast || validationAttempted) return;

    const validateAndRecover = async () => {
      setIsRecovering(true);
      setValidationAttempted(true);

      try {
        // Try to validate the original URL
        const isValid = await validatePodcastUrl(podcast.url);
        
        if (isValid) {
          setRecoveredUrl(podcast.url);
          setIsRecovering(false);
          return;
        }

        // If invalid, search for alternative URL
        console.log('Podcast link invalid, searching for alternative:', podcast.title);
        
        const { data, error } = await supabase.functions.invoke('recover-podcast-link', {
          body: {
            title: podcast.title,
            source: podcast.source,
            originalUrl: podcast.url
          }
        });

        if (error) throw error;

        if (data?.recoveredUrl) {
          console.log('Recovered podcast URL:', data.recoveredUrl);
          setRecoveredUrl(data.recoveredUrl);
        } else {
          // Fallback to original URL if recovery fails
          setRecoveredUrl(podcast.url);
        }
      } catch (error) {
        console.error('Podcast link recovery failed:', error);
        setRecoveredUrl(podcast.url); // Fallback to original
      } finally {
        setIsRecovering(false);
      }
    };

    validateAndRecover();
  }, [podcast, validationAttempted]);

  return { recoveredUrl, isRecovering };
};

async function validatePodcastUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
