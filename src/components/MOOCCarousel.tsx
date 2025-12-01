import { ExternalLink, GraduationCap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';

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
  // Filter to only show verified MOOCs, limit to 3
  const validMOOCs = moocs.filter(m => m.url && m.verified !== false).slice(0, 3);
  
  // Fallback for no valid MOOCs
  if (validMOOCs.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No verified MOOC courses found for this topic.
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

  const getSourceBadgeColor = (source: string) => {
    if (source.toLowerCase().includes('coursera')) return 'bg-blue-600 text-white';
    if (source.toLowerCase().includes('edx')) return 'bg-purple-600 text-white';
    if (source.toLowerCase().includes('khan')) return 'bg-green-600 text-white';
    if (source.toLowerCase().includes('udacity')) return 'bg-cyan-600 text-white';
    return 'bg-primary text-primary-foreground';
  };

  return (
    <div className="space-y-4">
      <Carousel className="w-full px-12">
        <CarouselContent>
          {validMOOCs.map((mooc, index) => (
            <CarouselItem key={index}>
              <Card className="border-2 border-border p-6 space-y-4">
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <Badge className={getSourceBadgeColor(mooc.source)}>
                        {mooc.source}
                      </Badge>
                      <h3 className="font-serif font-semibold text-lg">{mooc.title}</h3>
                      {mooc.duration && (
                        <p className="text-sm text-muted-foreground">Duration: {mooc.duration}</p>
                      )}
                    </div>
                    {mooc.verified === false && (
                      <Badge variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>

                  <div className="border-l-2 border-primary/20 pl-3 py-2">
                    <p className="text-sm text-muted-foreground">
                      Online course from {mooc.source} covering {stepTitle}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => window.open(mooc.url, '_blank')}
                  >
                    <GraduationCap className="h-3 w-3 mr-1" />
                    View Course
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
            <CarouselPrevious className="left-2 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
            <CarouselNext className="right-2 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};
