import { useState, useEffect } from 'react';
import { ExternalLink, GraduationCap, AlertTriangle, PlusCircle, Search, Loader2 } from 'lucide-react';
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
  isLoading?: boolean;
  onFindMore?: () => void;
}

export const MOOCSection = ({ moocs, stepTitle, discipline, isLoading = false, onFindMore }: MOOCSectionProps) => {
  const [localMOOCs, setLocalMOOCs] = useState(moocs);
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();

  // Debug logging
  console.log('📚 MOOCSection render:', { moocCount: moocs?.length, isLoading, moocs });

  // Sync local state when props change
  useEffect(() => {
    setLocalMOOCs(moocs);
  }, [moocs]);
  
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
    <Card key={index} className="border-2 border-border p-3 sm:p-5 space-y-3 sm:space-y-4 h-full w-full max-w-full overflow-hidden">
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
      <div className="space-y-2 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <Badge className={`${getSourceBadgeColor(mooc.source)} w-fit text-xs`}>
            {mooc.source}
          </Badge>
          {mooc.verified === false && (
            <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
              <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Unverified
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm sm:text-base line-clamp-2 break-words">{mooc.title}</h3>
        {mooc.author && (
          <p className="text-xs text-muted-foreground break-words">by {mooc.author}</p>
        )}
        {mooc.duration && (
          <p className="text-xs text-muted-foreground">{mooc.duration}</p>
        )}
      </div>

      {mooc.description && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
          {mooc.description}
        </p>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-border">
        <Button
          size="sm"
          variant="default"
          className="w-full text-xs sm:text-sm"
          onClick={() => window.open(mooc.url, '_blank')}
        >
          <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
          <span className="truncate">View Course</span>
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
      <div className="space-y-3 w-full max-w-full">
        <div className="flex items-center gap-2">
          <Badge className={`${badgeClass} text-xs`}>{label}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground">{groupMOOCs.length} course{groupMOOCs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {groupMOOCs.map((mooc, idx) => renderMOOCCard(mooc, idx))}
        </div>
      </div>
    );
  };

  // Loading state - show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading external courses...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (validMOOCs.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        <Card className="p-4 sm:p-8 text-center border-dashed">
          <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="font-semibold mb-2 text-sm sm:text-base">No External Courses Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            No Coursera or Udemy courses found for this topic. Try searching manually:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.coursera.org/search?query=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">Coursera</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.udemy.com/courses/search/?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">Udemy</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.edx.org/search?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">edX</span>
            </Button>
          </div>
        </Card>

        {/* Find More Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="sm"
            className="text-xs sm:text-sm"
            onClick={handleFindMore}
            disabled={isSearching}
          >
            <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
            {isSearching ? 'Searching...' : 'Search for Courses'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Coursera Section */}
      {renderMOOCGroup(courseraMOOCs, 'Coursera', 'bg-primary text-primary-foreground')}
      
      {/* Udemy Section */}
      {renderMOOCGroup(udemyMOOCs, 'Udemy', 'bg-secondary text-secondary-foreground')}
      
      {/* Other MOOCs */}
      {renderMOOCGroup(otherMOOCs, 'Other Platforms', 'bg-muted text-muted-foreground')}

      {/* Find More Button */}
      <div className="flex justify-center pt-2 sm:pt-4">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs sm:text-sm"
          onClick={handleFindMore}
          disabled={isSearching}
        >
          <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
          {isSearching ? 'Searching...' : 'Find More Courses'}
        </Button>
      </div>
    </div>
  );
};