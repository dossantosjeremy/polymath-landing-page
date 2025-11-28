import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStepSummary } from '@/hooks/useStepSummary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StepSummaryProps {
  stepTitle: string;
  discipline: string;
  stepDescription: string;
  sourceContent: string;
  resources?: any;
}

export const StepSummary = ({
  stepTitle,
  discipline,
  stepDescription,
  sourceContent,
  resources,
}: StepSummaryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { summary, isLoading, error, generateSummary } = useStepSummary();

  const handleGenerate = (forceRefresh: boolean = false) => {
    generateSummary(stepTitle, discipline, stepDescription, sourceContent, resources, forceRefresh);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className="border-t pt-4 mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <BookOpen className="h-4 w-4" />
            <span>Teaching Reference</span>
          </CollapsibleTrigger>
          
          {!summary && !isLoading && (
            <Button
              onClick={() => handleGenerate(false)}
              size="sm"
              variant="outline"
            >
              Generate Reference
            </Button>
          )}
          
          {summary && !isLoading && (
            <Button
              onClick={() => handleGenerate(true)}
              size="sm"
              variant="ghost"
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Generating comprehensive reference...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 border border-destructive/50 bg-destructive/5 text-sm text-destructive">
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
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-sm leading-relaxed space-y-3 text-foreground"
                dangerouslySetInnerHTML={{ 
                  __html: summary
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
                    .replace(/\n\n/g, '</p><p class="mt-3">')
                    .replace(/^(.+)$/, '<p>$1</p>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                }}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
