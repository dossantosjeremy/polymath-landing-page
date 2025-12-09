import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrustBadge, ResourceOrigin } from './TrustBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, ExternalLink, Clock, Video, FileText, BookOpen, Headphones, GraduationCap, Search, Flag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportResource } from '@/hooks/useReportResource';

interface CuratedResource {
  url: string;
  title: string;
  author?: string;
  duration?: string;
  domain?: string;
  type?: string;
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
}

interface ExpansionPackProps {
  deepDive: CuratedResource[];
  expansionPack: CuratedResource[];
  totalExpandedTime: string;
  onFindMore?: (type: 'video' | 'reading' | 'podcast') => void;
  isExpanded?: boolean;
  stepTitle?: string;
  discipline?: string;
  onResourceReplace?: (index: number, section: 'deepDive' | 'expansionPack', newResource: CuratedResource) => void;
  className?: string;
}

export function ExpansionPack({
  deepDive,
  expansionPack,
  totalExpandedTime,
  onFindMore,
  isExpanded: initialExpanded = false,
  stepTitle,
  discipline,
  onResourceReplace,
  className
}: ExpansionPackProps) {
  const [isOpen, setIsOpen] = useState(initialExpanded);
  
  const totalResources = deepDive.length + expansionPack.length;
  
  if (totalResources === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          <Plus className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-45"
          )} />
          <span className="font-medium text-sm">Want to go deeper?</span>
          <Badge variant="outline" className="ml-2">Optional</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalResources} resources</span>
          <span>•</span>
          <span>{totalExpandedTime}</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-3">
        {/* Deep Dive Section */}
        {deepDive.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Deep Dive Resources
            </h4>
            <div className="grid gap-2">
              {deepDive.map((resource, index) => (
                <ExpansionResourceCard 
                  key={index} 
                  resource={resource}
                  stepTitle={stepTitle}
                  discipline={discipline}
                  onReplace={onResourceReplace ? (r) => onResourceReplace(index, 'deepDive', r) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* All Other Resources */}
        {expansionPack.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Additional Resources
            </h4>
            <div className="grid gap-2">
              {expansionPack.map((resource, index) => (
                <ExpansionResourceCard 
                  key={index} 
                  resource={resource}
                  stepTitle={stepTitle}
                  discipline={discipline}
                  onReplace={onResourceReplace ? (r) => onResourceReplace(index, 'expansionPack', r) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Find More Dropdown */}
        {onFindMore && (
          <div className="pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="h-3 w-3 mr-1" />
                  Find More...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                <DropdownMenuItem onClick={() => onFindMore('video')}>
                  <Video className="h-4 w-4 mr-2" />
                  Videos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFindMore('reading')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Readings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFindMore('podcast')}>
                  <Headphones className="h-4 w-4 mr-2" />
                  Podcasts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ExpansionResourceCardProps {
  resource: CuratedResource;
  stepTitle?: string;
  discipline?: string;
  onReplace?: (newResource: CuratedResource) => void;
}

function ExpansionResourceCard({ resource, stepTitle, discipline, onReplace }: ExpansionResourceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { reportAndReplace, isReporting } = useReportResource();
  
  const getIcon = () => {
    const type = resource.type?.toLowerCase() || '';
    if (type === 'video' || resource.url?.includes('youtube')) return Video;
    if (type === 'podcast') return Headphones;
    if (type === 'mooc') return GraduationCap;
    if (type === 'book') return BookOpen;
    return FileText;
  };
  
  const Icon = getIcon();
  const isVideo = resource.type?.toLowerCase() === 'video' || resource.url?.includes('youtube');
  const videoId = isVideo ? resource.url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1] : null;

  const handleReport = async () => {
    if (!stepTitle || !discipline) return;
    
    const result = await reportAndReplace({
      brokenUrl: resource.url,
      resourceType: resource.type || 'reading',
      stepTitle,
      discipline,
      reportReason: 'Not relevant or broken'
    });
    
    if (result?.replacement && onReplace) {
      onReplace(result.replacement);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border hover:border-primary/30 transition-colors">
        <CardContent className="p-0">
          <CollapsibleTrigger className="w-full p-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0 space-y-1 text-left">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-sm font-medium line-clamp-1">{resource.title}</h5>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TrustBadge origin={resource.origin} />
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform text-muted-foreground",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </div>
                
                {resource.author && (
                  <p className="text-xs text-muted-foreground">by {resource.author}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{resource.consumptionTime}</span>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              {/* Video Embed */}
              {isVideo && videoId && (
                <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={resource.title}
                  />
                </div>
              )}
              
              {/* Embedded Reading Content */}
              {!isVideo && resource.embeddedContent && (
                <div className="p-3 bg-muted/30 rounded-lg max-h-64 overflow-y-auto text-sm prose prose-sm dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-foreground">{resource.embeddedContent}</pre>
                </div>
              )}
              
              {/* Snippet fallback if no embedded content */}
              {!isVideo && !resource.embeddedContent && resource.snippet && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                  {resource.snippet}
                </div>
              )}
              
              {/* Rationale */}
              <div className="p-2 bg-muted/50 rounded text-xs italic text-muted-foreground">
                "{resource.rationale}"
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleReport}
                  disabled={isReporting || !stepTitle}
                  title="Report & find replacement"
                >
                  {isReporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Flag className="h-3 w-3" />
                  )}
                </Button>
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
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
