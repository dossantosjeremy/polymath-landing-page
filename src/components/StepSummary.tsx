import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStepSummary } from '@/hooks/useStepSummary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';

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
  const [referenceLength, setReferenceLength] = useState<'brief' | 'standard' | 'comprehensive'>('standard');
  const { summary, isLoading, error, generateSummary } = useStepSummary();

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
            <span>Teaching Reference</span>
          </CollapsibleTrigger>
          
          {!summary && !isLoading && (
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
              <Button
                onClick={() => handleGenerate(false)}
                size="sm"
                variant="outline"
              >
                Generate
              </Button>
              <Button
                onClick={() => handleGenerate(true)}
                size="sm"
                variant="ghost"
                className="gap-1"
                title="Force fresh generation (bypass cache)"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
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
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
                  ),
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
