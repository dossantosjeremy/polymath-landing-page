import { useState } from 'react';
import { ExternalLink, GraduationCap, AlertTriangle, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';
import { useFindMoreResource } from '@/hooks/useFindMoreResource';
import { useToast } from '@/hooks/use-toast';

interface MOOC {
  url: string;
  title: string;
  source: string;
  duration?: string;
  verified?: boolean;
  archivedUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  author?: string;
}

interface MOOCSectionProps {
  moocs: MOOC[];
  stepTitle: string;
  discipline: string;
  onFindMore?: () => void;
}

export const MOOCSection = ({ moocs, stepTitle, discipline, onFindMore }: MOOCSectionProps) => {
  const [localMOOCs, setLocalMOOCs] = useState(moocs);
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();
  
  // Show courses even if they're unverified (some providers block HEAD checks)
  const validMOOCs = localMOOCs.filter(m => m.url);
  
  // Group MOOCs by source
  const courseraMOOCs = validMOOCs.filter(m => m.source?.toLowerCase().includes('coursera'));
  const udemyMOOCs = validMOOCs.filter(m => m.source?.toLowerCase().includes('udemy'));
  const otherMOOCs = validMOOCs.filter(m => 
    !m.source?.toLowerCase().includes('coursera') && 
    !m.source?.toLowerCase().includes('udemy')
  );

  const handleFindMore = async () => {
    try {
      const existingUrls = localMOOCs.map(m => m.url);
      const result = await findMore('mooc', stepTitle, discipline, existingUrls);
      
      if (result?.error) {
        toast({
          title: "No New Courses Found",
          description: result.message || "Could not find additional courses.",
          variant: "default"
        });
        return;
      }
      
      if (result) {
        setLocalMOOCs([...localMOOCs, result]);
        toast({
          title: "Course Added",
          description: `Added: ${result.title}`,
        });
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: "Could not find additional courses. Try again later.",
        variant: "destructive"
      });
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const s = source?.toLowerCase() || '';
    // Use design-system tokens (no hardcoded Tailwind colors)
    if (s.includes('coursera')) return 'bg-primary text-primary-foreground';
    if (s.includes('udemy')) return 'bg-secondary text-secondary-foreground';
    if (s.includes('edx')) return 'bg-accent text-accent-foreground';
    if (s.includes('khan') || s.includes('udacity')) return 'bg-muted text-muted-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const renderMOOCCard = (mooc: MOOC, index: number) => (
    <Card key={index} className="border-2 border-border p-5 space-y-4 h-full">
      {/* Thumbnail */}
      {mooc.thumbnailUrl && (
        <div className="aspect-video rounded-md overflow-hidden bg-muted">
          <img 
            src={mooc.thumbnailUrl} 
            alt={mooc.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge className={getSourceBadgeColor(mooc.source)}>
            {mooc.source}
          </Badge>
          {mooc.verified === false && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unverified
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-base line-clamp-2">{mooc.title}</h3>
        {mooc.author && (
          <p className="text-xs text-muted-foreground">by {mooc.author}</p>
        )}
        {mooc.duration && (
          <p className="text-xs text-muted-foreground">{mooc.duration}</p>
        )}
      </div>

      {mooc.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {mooc.description}
        </p>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-border">
        <Button
          size="sm"
          variant="default"
          className="w-full"
          onClick={() => window.open(mooc.url, '_blank')}
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          View Course
        </Button>
      </div>

      {mooc.verified === false && (
        <ResourceFallback
          title={mooc.title}
          originalUrl={mooc.url}
          archivedUrl={mooc.archivedUrl}
          searchQuery={`${stepTitle} ${discipline} course`}
          resourceType="video"
        />
      )}
    </Card>
  );

  const renderMOOCGroup = (groupMOOCs: MOOC[], label: string, badgeClass: string) => {
    if (groupMOOCs.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={badgeClass}>{label}</Badge>
          <span className="text-sm text-muted-foreground">{groupMOOCs.length} course{groupMOOCs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupMOOCs.map((mooc, idx) => renderMOOCCard(mooc, idx))}
        </div>
      </div>
    );
  };

  // Empty state
  if (validMOOCs.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center border-dashed">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Online Courses Found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            We couldn't find online courses for this topic. Try searching manually on these platforms:
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => window.open(`https://www.coursera.org/search?query=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Search Coursera
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`https://www.udemy.com/courses/search/?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Search Udemy
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`https://www.edx.org/search?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Search edX
            </Button>
          </div>
        </Card>

        {/* Find More Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            onClick={handleFindMore}
            disabled={isSearching}
          >
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search for Online Courses'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coursera Section */}
      {renderMOOCGroup(courseraMOOCs, 'Coursera', 'bg-primary text-primary-foreground')}
      
      {/* Udemy Section */}
      {renderMOOCGroup(udemyMOOCs, 'Udemy', 'bg-secondary text-secondary-foreground')}
      
      {/* Other MOOCs */}
      {renderMOOCGroup(otherMOOCs, 'Other Platforms', 'bg-muted text-muted-foreground')}

      {/* Find More Button */}
      <div className="flex justify-center pt-4">
        <Button 
          variant="outline" 
          onClick={handleFindMore}
          disabled={isSearching}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isSearching ? 'Searching...' : 'Find More Courses'}
        </Button>
      </div>
    </div>
  );
};