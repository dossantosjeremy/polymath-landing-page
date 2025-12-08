import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrustBadge, ResourceOrigin } from './TrustBadge';
import { ChevronDown, Plus, ExternalLink, Clock, Video, FileText, BookOpen, Headphones, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CuratedResource {
  url: string;
  title: string;
  author?: string;
  duration?: string;
  domain?: string;
  type?: string;
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
  onFindMore?: (type: 'video' | 'reading') => void;
  isExpanded?: boolean;
  className?: string;
}

export function ExpansionPack({
  deepDive,
  expansionPack,
  totalExpandedTime,
  onFindMore,
  isExpanded: initialExpanded = false,
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
                <ExpansionResourceCard key={index} resource={resource} />
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
                <ExpansionResourceCard key={index} resource={resource} />
              ))}
            </div>
          </div>
        )}
        
        {/* Find More Buttons */}
        {onFindMore && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFindMore('video')}
              className="flex-1"
            >
              <Video className="h-3 w-3 mr-1" />
              Find More Videos
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFindMore('reading')}
              className="flex-1"
            >
              <FileText className="h-3 w-3 mr-1" />
              Find More Readings
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ExpansionResourceCardProps {
  resource: CuratedResource;
}

function ExpansionResourceCard({ resource }: ExpansionResourceCardProps) {
  const getIcon = () => {
    const type = resource.type?.toLowerCase() || '';
    if (type === 'video' || resource.url?.includes('youtube')) return Video;
    if (type === 'podcast') return Headphones;
    if (type === 'mooc') return GraduationCap;
    if (type === 'book') return BookOpen;
    return FileText;
  };
  
  const Icon = getIcon();

  return (
    <Card className="border hover:border-primary/30 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-sm font-medium line-clamp-1">{resource.title}</h5>
              <TrustBadge origin={resource.origin} className="shrink-0" />
            </div>
            
            {resource.author && (
              <p className="text-xs text-muted-foreground">by {resource.author}</p>
            )}
            
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              "{resource.rationale}"
            </p>
            
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{resource.consumptionTime}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-6 px-2"
                onClick={() => window.open(resource.url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
