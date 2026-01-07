import { useState, useEffect, useMemo } from 'react';
import { Loader2, BookOpen, Target, Lightbulb, CheckCircle, AlertTriangle, ExternalLink, Play, FileText } from 'lucide-react';
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

// Loading skeleton that shows content is coming
function NarrativeLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      
      {/* Video placeholder */}
      <Card className="border-dashed border-2">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      {/* Reading placeholder */}
      <Card className="border-dashed border-2">
        <CardContent className="py-4 flex items-center gap-3">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

// Render an embedded video
function EmbeddedVideo({ resource }: { resource: CuratedResource }) {
  const videoId = resource.url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1];
  
  return (
    <div className="my-6 rounded-lg overflow-hidden border bg-card shadow-sm">
      {videoId ? (
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.title}
          />
        </div>
      ) : (
        <a 
          href={resource.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block aspect-video bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <div className="text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <span className="text-sm text-muted-foreground">Watch Video</span>
          </div>
        </a>
      )}
      <div className="p-4 bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm line-clamp-2">{resource.title}</h4>
            {resource.author && (
              <p className="text-xs text-muted-foreground mt-0.5">by {resource.author}</p>
            )}
            {resource.duration && (
              <Badge variant="secondary" className="text-xs mt-2">{resource.duration}</Badge>
            )}
          </div>
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {resource.rationale && (
          <p className="text-xs text-muted-foreground mt-2 italic">{resource.rationale}</p>
        )}
      </div>
    </div>
  );
}

// Render an embedded reading
function EmbeddedReading({ resource }: { resource: CuratedResource }) {
  return (
    <div className="my-6">
      <a 
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 shrink-0">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">{resource.title}</h4>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            {resource.domain && (
              <p className="text-xs text-muted-foreground mt-1">{resource.domain}</p>
            )}
            {resource.snippet && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{resource.snippet}</p>
            )}
            {resource.rationale && (
              <p className="text-xs text-primary mt-2 italic">{resource.rationale}</p>
            )}
            {resource.consumptionTime && (
              <Badge variant="outline" className="text-xs mt-2">{resource.consumptionTime} read</Badge>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}

// Hydrate embedded resource placeholders in the summary HTML
function hydrateEmbeddedResources(
  html: string, 
  resources?: { coreVideos?: CuratedResource[]; coreReadings?: CuratedResource[] }
): { html: string; resourcePlacements: Array<{ type: 'video' | 'reading'; index: number; position: number }> } {
  if (!resources) return { html, resourcePlacements: [] };
  
  const resourcePlacements: Array<{ type: 'video' | 'reading'; index: number; position: number }> = [];
  let position = 0;
  
  // Find all embedded-resource placeholders
  const placeholderPattern = /<div class="embedded-resource"[^>]*data-type="(\w+)"[^>]*data-index="(\d+)"[^>]*><\/div>/gi;
  
  const hydratedHtml = html.replace(placeholderPattern, (match, type, indexStr) => {
    const index = parseInt(indexStr, 10);
    position++;
    
    if (type === 'video' && resources.coreVideos?.[index]) {
      resourcePlacements.push({ type: 'video', index, position });
      return `<div data-resource-type="video" data-resource-index="${index}"></div>`;
    }
    
    if (type === 'reading' && resources.coreReadings?.[index]) {
      resourcePlacements.push({ type: 'reading', index, position });
      return `<div data-resource-type="reading" data-resource-index="${index}"></div>`;
    }
    
    return match; // Keep original if no matching resource
  });
  
  return { html: hydratedHtml, resourcePlacements };
}

// Split HTML content by resource placeholders and render with actual components
function NarrativeContent({ 
  html, 
  resources 
}: { 
  html: string; 
  resources?: { coreVideos?: CuratedResource[]; coreReadings?: CuratedResource[] };
}) {
  const parts = useMemo(() => {
    const result: Array<{ type: 'html' | 'video' | 'reading'; content: string; index?: number }> = [];
    
    // Split by resource markers
    const pattern = /<div data-resource-type="(video|reading)" data-resource-index="(\d+)"><\/div>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(html)) !== null) {
      // Add HTML before this resource
      if (match.index > lastIndex) {
        result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
      }
      
      // Add resource placeholder
      result.push({ 
        type: match[1] as 'video' | 'reading', 
        content: '', 
        index: parseInt(match[2], 10) 
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining HTML
    if (lastIndex < html.length) {
      result.push({ type: 'html', content: html.slice(lastIndex) });
    }
    
    return result;
  }, [html]);

  return (
    <div className="narrative-content">
      {parts.map((part, i) => {
        if (part.type === 'html') {
          return (
            <div 
              key={i}
              className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
        
        if (part.type === 'video' && resources?.coreVideos?.[part.index!]) {
          return <EmbeddedVideo key={i} resource={resources.coreVideos[part.index!]} />;
        }
        
        if (part.type === 'reading' && resources?.coreReadings?.[part.index!]) {
          return <EmbeddedReading key={i} resource={resources.coreReadings[part.index!]} />;
        }
        
        return null;
      })}
    </div>
  );
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
        'comprehensive',
        false
      );
    }
  }, [autoLoad, hasTriggeredGeneration, summary, isLoading, stepTitle, discipline, stepDescription, sourceContent, resources, generateSummary]);

  // Reset when step changes
  useEffect(() => {
    setHasTriggeredGeneration(false);
  }, [stepTitle]);

  // Hydrate embedded resources in the summary
  const { html: hydratedHtml } = useMemo(() => {
    if (!summary) return { html: '', resourcePlacements: [] };
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
      true
    );
  };

  return (
    <div className="narrative-learning-content space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Course Notes</h2>
          <Badge variant="outline" className="text-xs">
            Narrative-First
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
            <span className="text-sm">Generating course notes with embedded resources...</span>
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

      {/* Generated Content with Interwoven Resources */}
      {hydratedHtml && !isLoading && (
        <div className="space-y-6">
          <NarrativeContent html={hydratedHtml} resources={resources} />
          
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

          {/* Transition callout */}
          {narrativePosition && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">What's Next</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{narrativePosition}</p>
                </div>
              </div>
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

      {/* No content yet state */}
      {!summary && !isLoading && !error && (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Course notes will appear here</p>
          <Button onClick={handleRegenerate} size="sm" className="mt-4">
            Generate Course Notes
          </Button>
        </div>
      )}
    </div>
  );
}