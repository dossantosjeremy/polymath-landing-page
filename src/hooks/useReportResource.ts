import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReportResourceParams {
  brokenUrl: string;
  resourceType: string;
  stepTitle: string;
  discipline: string;
  reportReason?: string;
}

export function useReportResource() {
  const [isReporting, setIsReporting] = useState(false);

  const reportAndReplace = async (params: ReportResourceParams) => {
    setIsReporting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      toast({
        title: "Reporting broken link...",
        description: "Finding a replacement resource for you.",
      });

      const { data, error } = await supabase.functions.invoke('report-replace-resource', {
        body: {
          brokenUrl: params.brokenUrl,
          resourceType: params.resourceType,
          stepTitle: params.stepTitle,
          discipline: params.discipline,
          reportReason: params.reportReason || 'Broken link',
          userId: user?.id || null
        }
      });

      if (error) throw error;

      toast({
        title: "Link reported & replaced",
        description: "We've found a new resource for you.",
      });

      // Edge function returns replacement directly, not wrapped
      return { replacement: data };
    } catch (error) {
      console.error('Error reporting resource:', error);
      toast({
        title: "Failed to replace resource",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsReporting(false);
    }
  };

  return { reportAndReplace, isReporting };
}
