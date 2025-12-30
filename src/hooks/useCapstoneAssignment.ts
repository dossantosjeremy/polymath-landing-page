import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentData {
  assignmentName: string;
  sourceTier: 'extraction' | 'oer_search' | 'bok_synthesis';
  sourceLabel: string;
  sourceUrl?: string;
  scenario: string;
  instructions: string; // Changed from string[] to HTML string
  deliverableFormat: string;
  estimatedTime: string;
  role?: string;
  audience?: string;
  resourceAttachments?: Array<{
    title: string;
    url: string;
    type: 'pdf' | 'article' | 'external';
    pageRef?: string;
  }>;
}

export function useCapstoneAssignment() {
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  const fetchAssignment = async (
    stepTitle: string,
    discipline: string,
    sourceUrls: string[] = [],
    forceRefresh: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching capstone assignment for:', { stepTitle, discipline });

      const { data, error: functionError } = await supabase.functions.invoke('generate-assignment', {
        body: {
          stepTitle,
          discipline,
          sourceUrls,
          forceRefresh,
          locale: i18n.language,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate assignment');
      }

      const assignmentData: AssignmentData = {
        assignmentName: data.data.assignment_name,
        sourceTier: data.data.source_tier,
        sourceLabel: data.data.source_label,
        sourceUrl: data.data.source_url,
        scenario: data.data.scenario,
        instructions: data.data.instructions,
        deliverableFormat: data.data.deliverable_format,
        estimatedTime: data.data.estimated_time,
        role: data.data.role,
        audience: data.data.audience,
        resourceAttachments: data.data.resource_attachments,
      };

      setAssignment(assignmentData);
    } catch (err) {
      console.error('Error fetching capstone assignment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assignment,
    isLoading,
    error,
    fetchAssignment,
  };
}
