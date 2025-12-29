import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrustBadge, ScoreBreakdownBadge, ResourceOrigin } from './TrustBadge';
import { ExternalLink, Clock, Target, Play, FileText, Flag, Loader2, ChevronDown, ChevronUp, LinkIcon, Ban, BookOpen, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportResource } from '@/hooks/useReportResource';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArticleReaderDialog } from './ArticleReaderDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CuratedResource, AvailabilityReport, EpistemicRole } from '@/hooks/useCuratedResources';

interface CriticalPathProps {
  learningObjective: string;
  // New multi-core arrays
  coreVideos?: CuratedResource[];
  coreReadings?: CuratedResource[];
  // Legacy single-core (backward compatibility)
  coreVideo?: CuratedResource | null;
  coreReading?: CuratedResource | null;
  totalCoreTime: string;
  discipline?: string;
  stepTitle?: string;
  onResourceReplace?: (type: 'video' | 'reading', newResource: CuratedResource) => void;
  availabilityReport?: AvailabilityReport;
  className?: string;
}

export function CriticalPath({
  learningObjective,
  coreVideos = [],
  coreReadings = [],
  coreVideo,
  coreReading,
  totalCoreTime,
  discipline,
  stepTitle,
  onResourceReplace,
  availabilityReport,
  className
}: CriticalPathProps) {
  const [showMoreVideos, setShowMoreVideos] = useState(false);
  const [showMoreReadings, setShowMoreReadings] = useState(false);
  
  // Normalize to arrays (handle legacy single-core format)
  const videos = coreVideos.length > 0 ? coreVideos : (coreVideo ? [coreVideo] : []);
  const readings = coreReadings.length > 0 ? coreReadings : (coreReading ? [coreReading] : []);
  
  const primaryVideo = videos[0] || null;
  const additionalVideos = videos.slice(1);
  const primaryReading = readings[0] || null;
  const additionalReadings = readings.slice(1);

  const coveragePercent = Math.max(
    primaryVideo?.coveragePercent || 0,
    primaryReading?.coveragePercent || 0,
    85 // Default to 85% if not specified
  );

  const hasAnyContent = videos.length > 0 || readings.length > 0;
  const isLimitedByAvailability = availabilityReport?.wasLimitedByAvailability;

  return (
    <Card className={cn("border-2 border-primary/20 bg-primary/5 w-full max-w-full overflow-hidden", className)}>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white w-fit text-xs">✅ Core Requirement</Badge>
            {/* Show count of core resources */}
            {(videos.length > 1 || readings.length > 1) && (
              <Badge variant="outline" className="text-xs">
                {videos.length} video{videos.length !== 1 ? 's' : ''} • {readings.length} reading{readings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{totalCoreTime}</span>
            <span className="hidden sm:inline">•</span>
            <span>Covers {coveragePercent}%</span>
          </div>
        </div>
        
        {/* Availability warning if limited */}
        {isLimitedByAvailability && availabilityReport?.message && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {availabilityReport.message}
            </p>
          </div>
        )}
        
        {/* Learning Objective */}
        <div className="mt-3 p-2 sm:p-3 bg-background rounded-lg border">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm break-words">
              <span className="font-medium">Learning Objective: </span>
              {learningObjective}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-3 sm:px-6">
        {/* Primary Core Video */}
        {primaryVideo && (
          <CoreResourceCard
            type="video"
            resource={primaryVideo}
            discipline={discipline}
            stepTitle={stepTitle}
            onReplace={onResourceReplace ? (r) => onResourceReplace('video', r) : undefined}
          />
        )}
        
        {/* Additional Core Videos (collapsible) */}
        {additionalVideos.length > 0 && (
          <Collapsible open={showMoreVideos} onOpenChange={setShowMoreVideos}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showMoreVideos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>
                {showMoreVideos ? 'Hide' : 'Show'} {additionalVideos.length} more core video{additionalVideos.length > 1 ? 's' : ''}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      These videos also meet core criteria (foundational, canonical, or distinct approach)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {additionalVideos.map((video, idx) => (
                <CoreResourceCard
                  key={video.url || idx}
                  type="video"
                  resource={video}
                  discipline={discipline}
                  stepTitle={stepTitle}
                  onReplace={onResourceReplace ? (r) => onResourceReplace('video', r) : undefined}
                  isSecondary
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Primary Core Reading */}
        {primaryReading && (
          <CoreResourceCard
            type="reading"
            resource={primaryReading}
            discipline={discipline}
            stepTitle={stepTitle}
            onReplace={onResourceReplace ? (r) => onResourceReplace('reading', r) : undefined}
          />
        )}
        
        {/* Additional Core Readings (collapsible) */}
        {additionalReadings.length > 0 && (
          <Collapsible open={showMoreReadings} onOpenChange={setShowMoreReadings}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showMoreReadings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>
                {showMoreReadings ? 'Hide' : 'Show'} {additionalReadings.length} more core reading{additionalReadings.length > 1 ? 's' : ''}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      These readings also meet core criteria (foundational, canonical, or distinct approach)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {additionalReadings.map((reading, idx) => (
                <CoreResourceCard
                  key={reading.url || idx}
                  type="reading"
                  resource={reading}
                  discipline={discipline}
                  stepTitle={stepTitle}
                  onReplace={onResourceReplace ? (r) => onResourceReplace('reading', r) : undefined}
                  isSecondary
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Fallback when no core reading but has video */}
        {videos.length > 0 && readings.length === 0 && (
          <div className="border rounded-lg p-4 bg-muted/30 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No reading found for this step. Check the "All Resources" tab for additional materials.
            </p>
          </div>
        )}
        
        {/* Fallback when no core video but has reading */}
        {videos.length === 0 && readings.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/30 text-center">
            <Play className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No video found for this step. Check the "All Resources" tab for additional materials.
            </p>
          </div>
        )}
        
        {!hasAnyContent && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No core resources found for this step.
          </p>
        )}
        
        {/* Availability transparency */}
        {availabilityReport && hasAnyContent && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {availabilityReport.videosShownAsCore} of {availabilityReport.videosFound} videos • {availabilityReport.readingsShownAsCore} of {availabilityReport.readingsFound} readings shown as core
          </div>
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
  isSecondary?: boolean;
}

function CoreResourceCard({ type, resource, discipline, stepTitle, onReplace, isSecondary }: CoreResourceCardProps) {
  const isVideo = type === 'video';
  const Icon = isVideo ? Play : FileText;
  const { reportAndReplace, isReporting } = useReportResource();
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  
  // Extract video ID for embed
  const videoId = resource.url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
  
  // Check verification status
  const isUnverified = resource.verificationStatus === 'unverified' || resource.verified === false;

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
  
  // Get epistemic criteria explanation
  const getEpistemicBadges = () => {
    const role = resource.epistemicRole;
    if (!role) return null;
    
    const badges: { label: string; tooltip: string }[] = [];
    if (role.isFoundational) badges.push({ label: 'Foundational', tooltip: 'Introduces key terminology and frameworks' });
    if (role.isCanonical) badges.push({ label: 'Canonical', tooltip: 'Standard reference, frequently cited' });
    if (role.isDistinctApproach) badges.push({ label: 'Distinct', tooltip: 'Offers a unique interpretive approach' });
    if (role.isPrerequisite) badges.push({ label: 'Prerequisite', tooltip: 'Required for understanding downstream concepts' });
    
    return badges.length > 0 ? badges : null;
  };
  
  const epistemicBadges = getEpistemicBadges();

  return (
    <div className={cn(
      "border rounded-lg bg-background overflow-hidden w-full max-w-full",
      isSecondary && "border-dashed opacity-90"
    )}>
      {/* Unverified warning banner */}
      {isUnverified && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Link not verified - may be unavailable
          </span>
        </div>
      )}
      
      {/* Video Embed or Reading Preview */}
      {isVideo && videoId && (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.title}
          />
        </div>
      )}
      
      <div className="p-3 sm:p-4 space-y-3">
        {/* Header with badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded shrink-0",
              isVideo ? "bg-red-500/10" : "bg-blue-500/10"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                isVideo ? "text-red-600" : "text-blue-600"
              )} />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {isSecondary ? 'Additional' : 'Core'} {type}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <TrustBadge 
              origin={resource.origin} 
              domain={resource.domain}
              discipline={discipline}
            />
            <ScoreBreakdownBadge scoreBreakdown={resource.scoreBreakdown} />
          </div>
        </div>
        
        {/* Epistemic criteria badges */}
        {epistemicBadges && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {epistemicBadges.map(badge => (
              <TooltipProvider key={badge.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-primary/5 cursor-help">
                      {badge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{badge.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
        
        {/* Title and Author */}
        <div className="min-w-0">
          <h4 className="font-semibold text-sm line-clamp-2 break-words">{resource.title}</h4>
          {resource.author && (
            <p className="text-xs text-muted-foreground mt-1 break-words">
              by {resource.author}
            </p>
          )}
        </div>
        
        {/* Embedded content for readings - enhanced with full reader */}
        {!isVideo && resource.embeddedContent && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReaderOpen(true)}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Read In-App
              </Button>
              <Collapsible open={isContentExpanded} onOpenChange={setIsContentExpanded}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {isContentExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isContentExpanded ? 'Hide preview' : 'Show preview'}
                </CollapsibleTrigger>
              </Collapsible>
            </div>
            <Collapsible open={isContentExpanded} onOpenChange={setIsContentExpanded}>
              <CollapsibleContent className="mt-2">
                <div 
                  className="prose prose-sm max-w-none text-xs text-muted-foreground max-h-60 overflow-y-auto border rounded p-3 bg-muted/30"
                  dangerouslySetInnerHTML={{ __html: resource.embeddedContent }}
                />
              </CollapsibleContent>
            </Collapsible>
            <ArticleReaderDialog
              open={isReaderOpen}
              onOpenChange={setIsReaderOpen}
              title={resource.title}
              author={resource.author}
              domain={resource.domain}
              content={resource.embeddedContent}
              url={resource.url}
              readingTime={resource.consumptionTime}
            />
          </>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{resource.consumptionTime}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
