import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrustBadge, ScoreBreakdownBadge, ResourceOrigin } from './TrustBadge';
import { ExternalLink, Clock, Target, Play, FileText, Flag, Loader2, ChevronDown, ChevronUp, LinkIcon, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportResource } from '@/hooks/useReportResource';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
interface CuratedResource {
  url: string;
  title: string;
  author?: string;
  duration?: string;
  thumbnailUrl?: string;
  domain?: string;
  snippet?: string;
  embeddedContent?: string;
  priority: 'mandatory' | 'optional_expansion';
  origin: ResourceOrigin;
  scoreBreakdown: {
    syllabusMatch: number;
    authorityMatch: number;
    atomicScope: number;
    total: number;
  };
  rationale: string;
  consumptionTime: string;
  coveragePercent?: number;
}

interface CriticalPathProps {
  learningObjective: string;
  coreVideo: CuratedResource | null;
  coreReading: CuratedResource | null;
  totalCoreTime: string;
  discipline?: string;
  stepTitle?: string;
  onResourceReplace?: (type: 'video' | 'reading', newResource: CuratedResource) => void;
  className?: string;
}

export function CriticalPath({
  learningObjective,
  coreVideo,
  coreReading,
  totalCoreTime,
  discipline,
  stepTitle,
  onResourceReplace,
  className
}: CriticalPathProps) {
  const coveragePercent = Math.max(
    coreVideo?.coveragePercent || 0,
    coreReading?.coveragePercent || 0,
    85 // Default to 85% if not specified
  );

  return (
    <Card className={cn("border-2 border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge className="bg-green-600 text-white">✅ Core Requirement</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{totalCoreTime}</span>
            <span>•</span>
            <span>Covers {coveragePercent}% of topic</span>
          </div>
        </div>
        
        {/* Learning Objective */}
        <div className="mt-3 p-3 bg-background rounded-lg border">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Learning Objective: </span>
              {learningObjective}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Video */}
        {coreVideo && (
          <CoreResourceCard
            type="video"
            resource={coreVideo}
            discipline={discipline}
            stepTitle={stepTitle}
            onReplace={onResourceReplace ? (r) => onResourceReplace('video', r) : undefined}
          />
        )}
        
        {/* Core Reading */}
        {coreReading && (
          <CoreResourceCard
            type="reading"
            resource={coreReading}
            discipline={discipline}
            stepTitle={stepTitle}
            onReplace={onResourceReplace ? (r) => onResourceReplace('reading', r) : undefined}
          />
        )}
        
        {!coreVideo && !coreReading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No core resources found for this step.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CoreResourceCardProps {
  type: 'video' | 'reading';
  resource: CuratedResource;
  discipline?: string;
  stepTitle?: string;
  onReplace?: (newResource: CuratedResource) => void;
}

function CoreResourceCard({ type, resource, discipline, stepTitle, onReplace }: CoreResourceCardProps) {
  const isVideo = type === 'video';
  const Icon = isVideo ? Play : FileText;
  const { reportAndReplace, isReporting } = useReportResource();
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  // Extract video ID for embed
  const videoId = resource.url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];

  const handleReport = async (reason: 'broken' | 'not_relevant') => {
    if (!stepTitle || !discipline) return;
    
    const reportReason = reason === 'broken' ? 'Broken link' : 'Not relevant to topic';
    
    const result = await reportAndReplace({
      brokenUrl: resource.url,
      resourceType: type,
      stepTitle,
      discipline,
      reportReason
    });
    
    if (result?.replacement && onReplace) {
      onReplace(result.replacement as CuratedResource);
    }
  };

  return (
    <div className="border rounded-lg bg-background overflow-hidden">
      {/* Video Embed or Reading Preview */}
      {isVideo && videoId && (
        <div className="relative w-full h-0 pb-[56.25%] bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.title}
          />
        </div>
      )}
      
      <div className="p-4 space-y-3">
        {/* Header with badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded",
              isVideo ? "bg-red-500/10" : "bg-blue-500/10"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                isVideo ? "text-red-600" : "text-blue-600"
              )} />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Core {type}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <TrustBadge 
              origin={resource.origin} 
              domain={resource.domain}
              discipline={discipline}
            />
            <ScoreBreakdownBadge scoreBreakdown={resource.scoreBreakdown} />
          </div>
        </div>
        
        {/* Title and Author */}
        <div>
          <h4 className="font-semibold text-sm line-clamp-2">{resource.title}</h4>
          {resource.author && (
            <p className="text-xs text-muted-foreground mt-1">
              by {resource.author}
            </p>
          )}
        </div>
        
        {/* Embedded content for readings */}
        {!isVideo && resource.embeddedContent && (
          <Collapsible open={isContentExpanded} onOpenChange={setIsContentExpanded}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
              {isContentExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {isContentExpanded ? 'Hide article content' : 'Show article content'}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div 
                className="prose prose-sm max-w-none text-xs text-muted-foreground max-h-60 overflow-y-auto border rounded p-3 bg-muted/30"
                dangerouslySetInnerHTML={{ __html: resource.embeddedContent }}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Snippet fallback for readings without embedded content */}
        {!isVideo && !resource.embeddedContent && resource.snippet && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {resource.snippet}
          </p>
        )}
        
        {/* Rationale */}
        <div className="p-2 bg-muted/50 rounded text-xs italic text-muted-foreground">
          "{resource.rationale}"
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{resource.consumptionTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  disabled={isReporting || !stepTitle}
                  title="Report issue"
                >
                  {isReporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Flag className="h-3 w-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleReport('broken')}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link is broken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReport('not_relevant')}>
                  <Ban className="h-4 w-4 mr-2" />
                  Not relevant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(resource.url, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {isVideo ? 'Watch' : 'Read'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
