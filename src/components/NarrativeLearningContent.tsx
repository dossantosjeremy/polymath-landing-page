import { useState, useMemo, useCallback } from 'react';
import { Loader2, BookOpen, Target, Lightbulb, CheckCircle, AlertTriangle, ExternalLink, Play, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStepSummary } from '@/hooks/useStepSummary';
import { CuratedResource, CuratedStepResources } from '@/hooks/useCuratedResources';
import { useResourceCache } from '@/contexts/ResourceCacheContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NarrativeLearningContentProps {
  stepTitle: string;
  discipline: string;
  stepDescription: string;
  sourceContent: string;
  syllabusUrls?: string[];
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
function NarrativeLoadingSkeleton({ stage }: { stage: 'resources' | 'notes' }) {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm">
            {stage === 'resources' ? 'Finding learning resources...' : 'Generating course notes with embedded media...'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stage === 'resources' 
              ? 'Searching for videos, readings, and courses' 
              : 'Writing explanatory prose with interwoven resources'}
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
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
      
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
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
      
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

// Render an embedded video with better styling
function EmbeddedVideo({ resource }: { resource: CuratedResource }) {
  const videoId = resource.url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1];
  
  return (
    <div className="my-10 rounded-xl overflow-hidden border-2 border-primary/20 bg-card shadow-lg">
      {/* Video Player */}
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
          className="block aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center hover:from-primary/20 transition-colors"
        >
          <div className="text-center">
            <Play className="h-16 w-16 text-primary mx-auto mb-3" />
            <span className="text-sm text-muted-foreground">Watch Video (opens in new tab)</span>
          </div>
        </a>
      )}
      {/* Video Info */}
      <div className="p-6 bg-gradient-to-b from-muted/50 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-red-500 text-white text-xs px-2">🎬 Required Video</Badge>
              {resource.duration && (
                <Badge variant="outline" className="text-xs">{resource.duration}</Badge>
              )}
            </div>
            <h4 className="font-semibold text-lg leading-snug mb-1">{resource.title}</h4>
            {resource.author && (
              <p className="text-sm text-muted-foreground">by {resource.author}</p>
            )}
          </div>
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {resource.rationale && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50 italic leading-relaxed">
            💡 <strong>Why this video:</strong> {resource.rationale}
          </p>
        )}
      </div>
    </div>
  );
}

// Render an embedded reading with better styling and external link handling
function EmbeddedReading({ resource }: { resource: CuratedResource }) {
  return (
    <div className="my-10">
      <a 
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-card hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-md hover:shadow-lg group"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-500 text-white text-xs px-2">📄 Required Reading</Badge>
              {resource.consumptionTime && (
                <Badge variant="outline" className="text-xs">{resource.consumptionTime}</Badge>
              )}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 mr-1" />
                Opens in new tab
              </Badge>
            </div>
            <h4 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors mb-2">{resource.title}</h4>
            {resource.domain && (
              <p className="text-sm text-muted-foreground font-medium">{resource.domain}</p>
            )}
            {resource.snippet && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{resource.snippet}</p>
            )}
            {resource.rationale && (
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/30 italic leading-relaxed">
                📖 <strong>Why this reading:</strong> {resource.rationale}
              </p>
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
    <div className="narrative-content space-y-6">
      {parts.map((part, i) => {
        if (part.type === 'html') {
          return (
            <div 
              key={i}
              className={cn(
                "prose prose-lg prose-slate dark:prose-invert max-w-none",
                // --- HEADERS - Strong visual hierarchy with breathing room ---
                "prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20",
                "prose-h1:text-2xl prose-h1:mt-12 prose-h1:mb-6 prose-h1:text-primary",
                "prose-h2:text-xl prose-h2:mt-14 prose-h2:mb-5 prose-h2:pb-4 prose-h2:border-b-2 prose-h2:border-primary/20",
                "prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-foreground/90",
                "prose-h4:text-base prose-h4:font-semibold prose-h4:mt-8 prose-h4:mb-3",
                // --- PARAGRAPHS - Very generous spacing for easy reading ---
                "prose-p:text-base prose-p:leading-loose prose-p:mb-6 prose-p:text-foreground/90",
                // --- LINKS - Clearly clickable citations ---
                "prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-a:border-b prose-a:border-primary/40 hover:prose-a:border-primary hover:prose-a:text-primary/80",
                // --- LISTS - Scannable with generous spacing ---
                "prose-ul:my-6 prose-ul:ml-6 prose-ul:space-y-3",
                "prose-ol:my-6 prose-ol:ml-6 prose-ol:space-y-3",
                "prose-li:text-foreground/90 prose-li:leading-relaxed prose-li:pl-2",
                // --- BLOCKQUOTES - Prominent callouts with more padding ---
                "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:pl-6 prose-blockquote:pr-5 prose-blockquote:py-5 prose-blockquote:my-8 prose-blockquote:rounded-r-lg",
                "prose-blockquote:not-italic prose-blockquote:text-foreground",
                // --- STRONG/EM - Clear visual emphasis ---
                "prose-strong:font-bold prose-strong:text-foreground",
                "prose-em:italic prose-em:text-foreground/80",
                // --- MARK - Highlighted key points ---
                "[&_mark]:bg-yellow-100 [&_mark]:dark:bg-yellow-900/40 [&_mark]:px-1.5 [&_mark]:py-1 [&_mark]:rounded [&_mark]:font-medium",
                // --- CITATIONS - Superscript footnotes ---
                "[&_.citation]:text-primary [&_.citation]:font-semibold [&_.citation]:text-sm",
                "[&_.footnote]:text-primary [&_.footnote]:text-xs [&_.footnote]:font-bold",
                // --- CALLOUT BOXES - Styled definition/insight/example boxes with more room ---
                "[&_.callout-definition]:bg-blue-50 [&_.callout-definition]:dark:bg-blue-950/30 [&_.callout-definition]:border-l-4 [&_.callout-definition]:border-blue-500 [&_.callout-definition]:p-5 [&_.callout-definition]:my-8 [&_.callout-definition]:rounded-r-lg",
                "[&_.callout-key-insight]:bg-amber-50 [&_.callout-key-insight]:dark:bg-amber-950/30 [&_.callout-key-insight]:border-l-4 [&_.callout-key-insight]:border-amber-500 [&_.callout-key-insight]:p-5 [&_.callout-key-insight]:my-8 [&_.callout-key-insight]:rounded-r-lg",
                "[&_.callout-example]:bg-green-50 [&_.callout-example]:dark:bg-green-950/30 [&_.callout-example]:border-l-4 [&_.callout-example]:border-green-500 [&_.callout-example]:p-5 [&_.callout-example]:my-8 [&_.callout-example]:rounded-r-lg",
                "[&_.callout-warning]:bg-red-50 [&_.callout-warning]:dark:bg-red-950/30 [&_.callout-warning]:border-l-4 [&_.callout-warning]:border-red-500 [&_.callout-warning]:p-5 [&_.callout-warning]:my-8 [&_.callout-warning]:rounded-r-lg",
                // --- CITE in blockquotes ---
                "[&_cite]:block [&_cite]:text-sm [&_cite]:text-muted-foreground [&_cite]:mt-3 [&_cite]:not-italic",
                // --- CODE ---
                "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono"
              )}
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
  syllabusUrls = [],
  learningObjective,
  pedagogicalFunction,
  cognitiveLevel,
  narrativePosition,
  evidenceOfMastery,
  resources: propResources,
  autoLoad = false,
}: NarrativeLearningContentProps) {
  const { summary, isLoading: isSummaryLoading, error: summaryError, generateSummary, currentStepTitle } = useStepSummary();
  const { getResource, setResource, hasResource } = useResourceCache();
  const { toast } = useToast();
  
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'resources' | 'notes'>('resources');
  const [resourceError, setResourceError] = useState<string | null>(null);

  // Get resources from cache or props
  const cachedResources = getResource(stepTitle);
  const resources = propResources || (cachedResources ? {
    coreVideos: cachedResources.coreVideos,
    coreReadings: cachedResources.coreReadings,
  } : undefined);

  // Check if we have a summary for THIS step
  const hasCurrentSummary = summary && currentStepTitle === stepTitle;

  // Hydrate embedded resources in the summary
  const { html: hydratedHtml } = useMemo(() => {
    if (!hasCurrentSummary) return { html: '', resourcePlacements: [] };
    return hydrateEmbeddedResources(summary, resources);
  }, [hasCurrentSummary, summary, resources]);

  // Unified loading: fetch resources first, then generate notes with them
  const handleGenerateWithResources = useCallback(async (forceRefresh = false) => {
    setResourceError(null);
    
    // Step 1: Check if we have cached resources, if not fetch them
    let currentResources = resources;
    
    if (!hasResource(stepTitle) || forceRefresh) {
      setIsLoadingResources(true);
      setLoadingStage('resources');
      
      try {
        const { data, error } = await supabase.functions.invoke('fetch-step-resources', {
          body: { 
            stepTitle, 
            discipline, 
            syllabusUrls,
            useCuratedFormat: true,
            forceRefresh
          }
        });
        
        if (error) throw error;
        
        // Cache the resources
        if (data) {
          const curatedResources: Partial<CuratedStepResources> = {
            coreVideos: data.coreVideos || data.core?.videos || [],
            coreReadings: data.coreReadings || data.core?.readings || [],
            coreVideo: null,
            coreReading: null,
            learningObjective: data.learningObjective || '',
            totalCoreTime: data.totalCoreTime || '',
            totalExpandedTime: data.totalExpandedTime || '',
            deepDive: data.deepDive || [],
            expansionPack: data.expansionPack || [],
            moocs: data.moocs || [],
            excludedCore: data.excludedCore || [],
            availabilityReport: data.availabilityReport || { videosFound: 0, videosShownAsCore: 0, readingsFound: 0, readingsShownAsCore: 0, wasLimitedByAvailability: false },
            videos: data.videos || [],
            readings: data.readings || [],
            books: data.books || [],
            alternatives: data.alternatives || [],
          };
          setResource(stepTitle, curatedResources as CuratedStepResources);
          currentResources = {
            coreVideos: curatedResources.coreVideos || [],
            coreReadings: curatedResources.coreReadings || [],
          };
          
          toast({
            title: "Resources loaded",
            description: `Found ${curatedResources.coreVideos?.length || 0} videos, ${curatedResources.coreReadings?.length || 0} readings`,
          });
        }
      } catch (err) {
        console.error('Error fetching resources:', err);
        setResourceError(err instanceof Error ? err.message : 'Failed to load resources');
        setIsLoadingResources(false);
        return;
      }
    }
    
    // Step 2: Generate notes with the resources
    setLoadingStage('notes');
    setIsLoadingResources(false);
    
    await generateSummary(
      stepTitle, 
      discipline, 
      stepDescription, 
      sourceContent, 
      currentResources,
      'comprehensive',
      forceRefresh,
      learningObjective,
      pedagogicalFunction,
      cognitiveLevel,
      narrativePosition,
      evidenceOfMastery
    );
  }, [stepTitle, discipline, syllabusUrls, resources, hasResource, setResource, generateSummary, stepDescription, sourceContent, learningObjective, pedagogicalFunction, cognitiveLevel, narrativePosition, evidenceOfMastery, toast]);

  const handleGenerate = () => handleGenerateWithResources(false);
  const handleRegenerate = () => handleGenerateWithResources(true);
  
  const isLoading = isLoadingResources || isSummaryLoading;
  const error = resourceError || summaryError;

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
        <NarrativeLoadingSkeleton stage={loadingStage} />
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
      {hasCurrentSummary && !isLoading && (
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

      {/* No content yet - Show Generate Button */}
      {!hasCurrentSummary && !isLoading && !error && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-2">Course Notes</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Generate AI-authored course notes for this step with embedded videos and readings
          </p>
          <Button onClick={handleGenerate} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Course Notes
          </Button>
        </div>
      )}
    </div>
  );
}