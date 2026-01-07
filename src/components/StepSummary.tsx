import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStepSummary } from '@/hooks/useStepSummary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface StepSummaryProps {
  stepTitle: string;
  discipline: string;
  stepDescription: string;
  sourceContent: string;
  resources?: any;
  // NEW: Pedagogical metadata for Course Grammar
  learningObjective?: string;
  pedagogicalFunction?: string;
  cognitiveLevel?: string;
  narrativePosition?: string;
  evidenceOfMastery?: string;
  autoLoad?: boolean;
}

// Loading skeleton for the summary content
function SummaryLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

export const StepSummary = ({
  stepTitle,
  discipline,
  stepDescription,
  sourceContent,
  resources,
  learningObjective,
  pedagogicalFunction,
  cognitiveLevel,
  narrativePosition,
  evidenceOfMastery,
  autoLoad = false,
}: StepSummaryProps) => {
  const [isOpen, setIsOpen] = useState(autoLoad);
  const [referenceLength, setReferenceLength] = useState<'brief' | 'standard' | 'comprehensive'>('comprehensive');
  const { summary, isLoading, error, generateSummary } = useStepSummary();
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  // Auto-generate on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad && !hasAutoLoaded && !summary && !isLoading) {
      setHasAutoLoaded(true);
      generateSummary(
        stepTitle, 
        discipline, 
        stepDescription, 
        sourceContent, 
        resources, 
        referenceLength, 
        false
      );
    }
  }, [autoLoad, hasAutoLoaded, summary, isLoading, stepTitle, discipline, stepDescription, sourceContent, resources, referenceLength, generateSummary]);

  const handleGenerate = (forceRefresh: boolean = false) => {
    generateSummary(stepTitle, discipline, stepDescription, sourceContent, resources, referenceLength, forceRefresh);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className="border-t pt-4 mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <BookOpen className="h-4 w-4" />
            <span>AI Notes Summary</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-2">
            <Select value={referenceLength} onValueChange={(value: any) => setReferenceLength(value)}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Quick Overview</SelectItem>
                <SelectItem value="standard">Standard Reference</SelectItem>
                <SelectItem value="comprehensive">Full Reference</SelectItem>
              </SelectContent>
            </Select>
            
            {!summary && !isLoading && (
              <Button
                onClick={() => handleGenerate(false)}
                size="sm"
                variant="outline"
              >
                Generate
              </Button>
            )}
            
            {summary && !isLoading && (
              <Button
                onClick={() => handleGenerate(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent className="mt-4">
          {isLoading && <SummaryLoadingSkeleton />}

          {error && !isLoading && (
            <div className="p-4 border border-destructive/50 bg-destructive/5 text-sm text-destructive rounded-lg">
              <p className="font-medium">Error generating reference</p>
              <p className="mt-1">{error}</p>
              <Button
                onClick={() => handleGenerate(false)}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          )}

          {summary && !isLoading && (
            <div 
              className="academic-reference-content text-foreground prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
