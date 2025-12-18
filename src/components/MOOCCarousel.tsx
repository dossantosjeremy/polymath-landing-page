import { useState } from 'react';
import { ExternalLink, GraduationCap, AlertTriangle, PlusCircle } from 'lucide-react';
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
}

interface MOOCCarouselProps {
  moocs: MOOC[];
  stepTitle: string;
  discipline: string;
}

export const MOOCCarousel = ({ moocs, stepTitle, discipline }: MOOCCarouselProps) => {
  const [localMOOCs, setLocalMOOCs] = useState(moocs);
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();
  
  // Show MOOCs even if they're unverified (some providers block HEAD checks), limit to 3
  const validMOOCs = localMOOCs.filter(m => m.url).slice(0, 3);
  
  // Fallback for no valid MOOCs
  if (validMOOCs.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No MOOC courses found for this topic.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(`https://www.coursera.org/search?query=${encodeURIComponent(stepTitle)}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Search Coursera
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://www.edx.org/search?q=${encodeURIComponent(stepTitle)}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Search edX
          </Button>
        </div>
      </Card>
    );
  }

  const handleFindMore = async () => {
    if (validMOOCs.length >= 3) {
      toast({
        title: "Limit Reached",
        description: "Maximum of 3 MOOCs can be displayed.",
        variant: "destructive"
      });
      return;
    }

    try {
      const existingUrls = localMOOCs.map(m => m.url);
      const result = await findMore('mooc', stepTitle, discipline, existingUrls);
      
      // Check if it's an error response
      if (result?.error) {
        toast({
          title: "No New MOOCs Found",
          description: result.message || "Could not find additional MOOCs that aren't already in your list.",
          variant: "default"
        });
        return;
      }
      
      if (result) {
        setLocalMOOCs([...localMOOCs, result]);
        toast({
          title: "MOOC Added",
          description: `Added: ${result.title}`,
        });
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: "Could not find additional MOOCs. Try again later.",
        variant: "destructive"
      });
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const s = source.toLowerCase();
    // Use design-system tokens (no hardcoded Tailwind colors)
    if (s.includes('coursera')) return 'bg-primary text-primary-foreground';
    if (s.includes('edx')) return 'bg-accent text-accent-foreground';
    if (s.includes('khan') || s.includes('udacity')) return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      <Carousel className="w-full max-w-full min-w-0 overflow-hidden">
        <CarouselContent className="-ml-2 sm:-ml-4">
          {validMOOCs.map((mooc, index) => (
            <CarouselItem key={index} className="pl-2 sm:pl-4 basis-full min-w-0 w-full max-w-full">
              <Card className="border-2 border-border p-3 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-full min-w-0 overflow-hidden break-words">
                {/* Header */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                      <Badge className={`${getSourceBadgeColor(mooc.source)} text-xs`}>
                        {mooc.source}
                      </Badge>
                      <h3 className="font-serif font-semibold text-base sm:text-lg break-words">{mooc.title}</h3>
                      {mooc.duration && (
                        <p className="text-xs sm:text-sm text-muted-foreground">Duration: {mooc.duration}</p>
                      )}
                    </div>
                    {mooc.verified === false && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>

                  <div className="border-l-2 border-primary/20 pl-3 py-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Online course from {mooc.source} covering {stepTitle}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs sm:text-sm"
                    onClick={() => window.open(mooc.url, '_blank')}
                  >
                    <GraduationCap className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">View Course</span>
                  </Button>
                </div>

                {/* Fallback options */}
                {mooc.verified === false && (
                  <ResourceFallback
                    title={mooc.title}
                    originalUrl={mooc.url}
                    archivedUrl={mooc.archivedUrl}
                    searchQuery={`${stepTitle} ${discipline} MOOC course`}
                    resourceType="video"
                  />
                )}
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {validMOOCs.length > 1 && (
          <>
            <CarouselPrevious className="hidden sm:flex -left-4 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
            <CarouselNext className="hidden sm:flex -right-4 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
          </>
        )}
      </Carousel>
      
      {/* Find More Button */}
      <div className="flex justify-center pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleFindMore}
          disabled={isSearching || validMOOCs.length >= 3}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isSearching ? 'Searching...' : 'Find One More MOOC'}
        </Button>
      </div>
    </div>
  );
};
