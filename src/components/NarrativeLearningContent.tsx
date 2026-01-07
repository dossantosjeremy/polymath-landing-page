import { useState, useMemo, useCallback } from 'react';
import {
  Loader2,
  BookOpen,
  Target,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Play,
  FileText,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStepSummary } from '@/hooks/useStepSummary';
import type { CuratedResource, CuratedStepResources } from '@/hooks/useCuratedResources';
import { useResourceCache } from '@/contexts/ResourceCacheContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { classifyGranularity } from '@/types/learningObjects';

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

type LessonResource = {
  url: string;
  title: string;
  source?: string;
  duration?: string;
  description?: string;
  author?: string;
  type?: string;
  is_atomic?: boolean;
  granularity?: string;
  course_title?: string;
  course_url?: string;
};

function extractLessonResources(moocs: any[] | undefined): LessonResource[] {
  if (!Array.isArray(moocs)) return [];

  return moocs
    .filter((m) => {
      if (!m?.url || !m?.title) return false;
      if (m.is_atomic === true) return true;
      if (m.type === 'lesson') return true;

      const classification = classifyGranularity(m.url, {
        is_atomic: m.is_atomic,
        course_title: m.course_title,
        course_url: m.course_url,
      });

      return classification.granularity === 'atomic_lesson';
    })
    .slice(0, 3)
    .map((m) => ({
      url: m.url,
      title: m.title,
      source: m.source,
      duration: m.duration,
      description: m.description,
      author: m.author,
      type: m.type,
      is_atomic: m.is_atomic,
      granularity: m.granularity,
      course_title: m.course_title,
      course_url: m.course_url,
    }));
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
    <div className="my-10 rounded-xl overflow-hidden border bg-card">
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
          className="block aspect-video bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <div className="text-center">
            <Play className="h-16 w-16 text-primary mx-auto mb-3" />
            <span className="text-sm text-muted-foreground">Watch video (opens in new tab)</span>
          </div>
        </a>
      )}

      {/* Video Info */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="destructive" className="text-xs px-2">
                Required Video
              </Badge>
              {resource.duration && <Badge variant="outline" className="text-xs">{resource.duration}</Badge>}
            </div>
            <h4 className="font-semibold text-lg leading-snug mb-1">{resource.title}</h4>
            {resource.author && <p className="text-sm text-muted-foreground">by {resource.author}</p>}
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {resource.rationale && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border italic leading-relaxed">
            <strong>Why this video:</strong> {resource.rationale}
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
        className="block p-6 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-muted shrink-0">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs px-2">
                Required Reading
              </Badge>
              {resource.consumptionTime && <Badge variant="outline" className="text-xs">{resource.consumptionTime}</Badge>}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 mr-1" />
                Opens in new tab
              </Badge>
            </div>

            <h4 className="font-semibold text-lg leading-snug mb-2">{resource.title}</h4>
            {resource.domain && <p className="text-sm text-muted-foreground font-medium">{resource.domain}</p>}
            {resource.snippet && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{resource.snippet}</p>}

            {resource.rationale && (
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border italic leading-relaxed">
                <strong>Why this reading:</strong> {resource.rationale}
              </p>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}

function EmbeddedLesson({ resource }: { resource: LessonResource }) {
  return (
    <div className="my-10">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-6 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-muted shrink-0">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="default" className="text-xs px-2">
                Lesson
              </Badge>
              {resource.duration && <Badge variant="outline" className="text-xs">{resource.duration}</Badge>}
              {resource.source && <Badge variant="outline" className="text-xs">{resource.source}</Badge>}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 mr-1" />
                Opens in new tab
              </Badge>
            </div>

            <h4 className="font-semibold text-lg leading-snug mb-2">{resource.title}</h4>
            {resource.description && <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>}
          </div>
        </div>
      </a>
    </div>
  );
}

// Hydrate embedded resource placeholders in the summary HTML
function hydrateEmbeddedResources(
  html: string,
  resources?: { coreVideos?: CuratedResource[]; coreReadings?: CuratedResource[]; lessons?: LessonResource[] },
): {
  html: string;
  resourcePlacements: Array<{ type: 'video' | 'reading' | 'lesson'; index: number; position: number }>;
} {
  if (!resources) return { html, resourcePlacements: [] };

  const resourcePlacements: Array<{ type: 'video' | 'reading' | 'lesson'; index: number; position: number }> = [];
  let position = 0;

  // Find all embedded-resource placeholders
  const placeholderPattern =
    /<div class="embedded-resource"[^>]*data-type="(\w+)"[^>]*data-index="(\d+)"[^>]*><\/div>/gi;

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

    if (type === 'lesson' && resources.lessons?.[index]) {
      resourcePlacements.push({ type: 'lesson', index, position });
      return `<div data-resource-type="lesson" data-resource-index="${index}"></div>`;
    }

    return match; // Keep original if no matching resource
  });

  return { html: hydratedHtml, resourcePlacements };
}

// Split HTML content by resource placeholders and render with actual components
function NarrativeContent({
  html,
  resources,
}: {
  html: string;
  resources?: { coreVideos?: CuratedResource[]; coreReadings?: CuratedResource[]; lessons?: LessonResource[] };
}) {
  const parts = useMemo(() => {
    const result: Array<{ type: 'html' | 'video' | 'reading' | 'lesson'; content: string; index?: number }> = [];

    // Split by resource markers
    const pattern = /<div data-resource-type="(video|reading|lesson)" data-resource-index="(\d+)"><\/div>/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(html)) !== null) {
      // Add HTML before this resource
      if (match.index > lastIndex) {
        result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
      }

      // Add resource placeholder
      result.push({
        type: match[1] as 'video' | 'reading' | 'lesson',
        content: '',
        index: parseInt(match[2], 10),
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
                "narrative-prose max-w-none text-foreground",
                // Headings
                "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4",
                "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border",
                "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3",
                "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2",
                // Paragraphs
                "[&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4",
                // Links & citations
                "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-90",
                "[&_.citation]:font-semibold [&_.footnote]:font-semibold",
                // Lists
                "[&_ul]:my-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul>li]:mb-2",
                "[&_ol]:my-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol>li]:mb-2",
                // Blockquotes
                "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-muted/30 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:rounded-r-lg",
                "[&_blockquote_p]:mb-2",
                "[&_blockquote_cite]:block [&_blockquote_cite]:text-sm [&_blockquote_cite]:text-muted-foreground [&_blockquote_cite]:mt-2 [&_blockquote_cite]:not-italic",
                // Callouts
                "[&_.callout-definition]:my-6 [&_.callout-definition]:rounded-lg [&_.callout-definition]:border [&_.callout-definition]:border-border [&_.callout-definition]:bg-muted/30 [&_.callout-definition]:p-4",
                "[&_.callout-key-insight]:my-6 [&_.callout-key-insight]:rounded-lg [&_.callout-key-insight]:border [&_.callout-key-insight]:border-primary/30 [&_.callout-key-insight]:bg-primary/5 [&_.callout-key-insight]:p-4",
                "[&_.callout-example]:my-6 [&_.callout-example]:rounded-lg [&_.callout-example]:border [&_.callout-example]:border-secondary/40 [&_.callout-example]:bg-secondary/10 [&_.callout-example]:p-4",
                "[&_.callout-warning]:my-6 [&_.callout-warning]:rounded-lg [&_.callout-warning]:border [&_.callout-warning]:border-destructive/30 [&_.callout-warning]:bg-destructive/5 [&_.callout-warning]:p-4",
                // Highlights
                "[&_mark]:rounded [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:bg-accent/20"
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

        if (part.type === 'lesson' && resources?.lessons?.[part.index!]) {
          return <EmbeddedLesson key={i} resource={resources.lessons[part.index!]} />;
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
  const cachedLessons = cachedResources ? extractLessonResources(cachedResources.moocs) : [];

  const resources = propResources
    ? { ...propResources, lessons: cachedLessons }
    : cachedResources
      ? {
          coreVideos: cachedResources.coreVideos,
          coreReadings: cachedResources.coreReadings,
          lessons: cachedLessons,
        }
      : undefined;

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

          const lessons = extractLessonResources(curatedResources.moocs);
          currentResources = {
            coreVideos: curatedResources.coreVideos || [],
            coreReadings: curatedResources.coreReadings || [],
            lessons,
          };

          toast({
            title: "Resources loaded",
            description: `Found ${(curatedResources.coreVideos?.length || 0)} videos, ${(curatedResources.coreReadings?.length || 0)} readings, ${lessons.length} lessons`,
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
      'standard',
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
                <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg border border-secondary/30">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Evidence of Mastery</p>
                    <p className="text-sm text-foreground">{evidenceOfMastery}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transition callout */}
          {narrativePosition && (
            <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">What’s Next</p>
                  <p className="text-sm text-foreground">{narrativePosition}</p>
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