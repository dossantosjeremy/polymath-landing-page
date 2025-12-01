import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFindMoreResource = () => {
  const [isSearching, setIsSearching] = useState(false);

  const findMore = async (
    resourceType: 'video' | 'reading' | 'mooc',
    stepTitle: string,
    discipline: string,
    existingUrls: string[]
  ) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-additional-resource', {
        body: { 
          resourceType, 
          stepTitle, 
          discipline,
          existingUrls 
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error finding additional resource:', err);
      throw err;
    } finally {
      setIsSearching(false);
    }
  };

  return { findMore, isSearching };
};
