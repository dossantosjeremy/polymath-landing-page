import { useState, useEffect, useMemo } from 'react';
import { Loader2, BookOpen, Target, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStepSummary } from '@/hooks/useStepSummary';
import { CuratedResource } from '@/hooks/useCuratedResources';
import { cn } from '@/lib/utils';

interface NarrativeLearningContentProps {
  stepTitle: string;
  discipline: string;
  stepDescription: string;
  sourceContent: string;
  learningObjective?: string;
  pedagogicalFunction?: string;
  cognitiveLevel?: string;
  narrativePosition?: string;
  evidenceOfMastery?: string;
  resources?: {
    coreVideos?: CuratedResource[];
    coreReadings?: CuratedResource[];
  };
  autoLoad?: boolean;
}

// Loading skeleton that shows content is coming (Harvard-style structure preview)
function NarrativeLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Section I preview */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      
      {/* Embedded resource placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </CardContent>
      </Card>
      
      {/* Section II preview */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </div>
      
      {/* Cognitive metadata */}
      <div className="border-t pt-4 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Hydrate embedded resource placeholders in the summary HTML
function hydrateEmbeddedResources(
  html: string, 
  resources?: { coreVideos?: CuratedResource[]; coreReadings?: CuratedResource[] }
): string {
  if (!resources) return html;
  
  // Replace embedded-resource placeholders with actual resource cards
  // Format: <div class="embedded-resource" data-type="video|reading" data-url="URL">...</div>
  let hydratedHtml = html;
  
  // Find all embedded-resource divs and replace with actual resource embeds
  const placeholderPattern = /<div class="embedded-resource"[^>]*data-type="(\w+)"[^>]*data-url="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi;
  
  hydratedHtml = hydratedHtml.replace(placeholderPattern, (match, type, url) => {
    const resourceList = type === 'video' ? resources.coreVideos : resources.coreReadings;
    const resource = resourceList?.find(r => r.url === url) || resourceList?.[0];
    
    if (!resource) return match; // Keep original if no resource found
    
    if (type === 'video' && resource.url) {
      const videoId = resource.url.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
      if (videoId) {
        return `
          <div class="embedded-video-container my-6 rounded-lg overflow-hidden border">
            <div class="aspect-video bg-black">
              <iframe
                src="https://www.youtube.com/embed/${videoId}"
                class="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="${resource.title}"
              ></iframe>
            </div>
            <div class="p-3 bg-muted/30 text-sm">
              <p class="font-medium">${resource.title}</p>
              ${resource.author ? `<p class="text-muted-foreground text-xs">by ${resource.author}</p>` : ''}
              ${resource.rationale ? `<p class="text-xs text-muted-foreground mt-1">${resource.rationale}</p>` : ''}
            </div>
          </div>
        `;
      }
    }
    
    if (type === 'reading' && resource.url) {
      return `
        <div class="embedded-reading-container my-6 p-4 rounded-lg border bg-muted/20">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded bg-blue-500/10">
              <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="font-medium hover:text-primary transition-colors line-clamp-2">
                ${resource.title}
              </a>
              ${resource.domain ? `<p class="text-xs text-muted-foreground mt-0.5">${resource.domain}</p>` : ''}
              ${resource.snippet ? `<p class="text-xs text-muted-foreground mt-1">${resource.snippet}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }
    
    return match;
  });
  
  return hydratedHtml;
}

export function NarrativeLearningContent({
  stepTitle,
  discipline,
  stepDescription,
  sourceContent,
  learningObjective,
  pedagogicalFunction,
  cognitiveLevel,
  narrativePosition,
  evidenceOfMastery,
  resources,
  autoLoad = true,
}: NarrativeLearningContentProps) {
  const { summary, isLoading, error, generateSummary } = useStepSummary();
  const [hasTriggeredGeneration, setHasTriggeredGeneration] = useState(false);

  // Auto-generate on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad && !hasTriggeredGeneration && !summary && !isLoading) {
      setHasTriggeredGeneration(true);
      generateSummary(
        stepTitle, 
        discipline, 
        stepDescription, 
        sourceContent, 
        resources,
        'comprehensive', // Always use comprehensive for course notes
        false // Don't force refresh if cached
      );
    }
  }, [autoLoad, hasTriggeredGeneration, summary, isLoading, stepTitle, discipline, stepDescription, sourceContent, resources, generateSummary]);

  // Hydrate embedded resources in the summary
  const hydratedSummary = useMemo(() => {
    if (!summary) return null;
    return hydrateEmbeddedResources(summary, resources);
  }, [summary, resources]);

  const handleRegenerate = () => {
    generateSummary(
      stepTitle, 
      discipline, 
      stepDescription, 
      sourceContent, 
      resources,
      'comprehensive',
      true // Force refresh
    );
  };

  return (
    <div className="narrative-learning-content space-y-6">
      {/* Header with pedagogical context */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Course Notes</h2>
          <Badge variant="outline" className="text-xs">
            Harvard-Style
          </Badge>
        </div>
        
        {learningObjective && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-primary/5 rounded-lg">
            <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Learning Objective</p>
              <p className="text-sm">{learningObjective}</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating comprehensive course notes...</span>
          </div>
          <NarrativeLoadingSkeleton />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 border border-destructive/50 bg-destructive/5 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error generating course notes</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button
                onClick={handleRegenerate}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Content */}
      {hydratedSummary && !isLoading && (
        <div className="space-y-6">
          {/* Main narrative content */}
          <div 
            className="narrative-content prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: hydratedSummary }}
          />
          
          {/* Cognitive metadata footer */}
          {(cognitiveLevel || evidenceOfMastery) && (
            <div className="border-t pt-4 space-y-3 mt-8">
              {cognitiveLevel && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">
                    Cognitive Level: {cognitiveLevel.charAt(0).toUpperCase() + cognitiveLevel.slice(1)}
                  </Badge>
                </div>
              )}
              
              {evidenceOfMastery && (
                <div className="flex items-start gap-2 p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">Evidence of Mastery</p>
                    <p className="text-sm text-green-900 dark:text-green-200">{evidenceOfMastery}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regenerate option */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleRegenerate}
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
            >
              Regenerate Notes
            </Button>
          </div>
        </div>
      )}

      {/* Narrative context callout */}
      {narrativePosition && !isLoading && hydratedSummary && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200/50 dark:border-amber-800/30 mt-6">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Transition Forward</p>
              <p className="text-sm text-amber-900 dark:text-amber-200">{narrativePosition}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
