import { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, FileText, ChevronDown, ChevronUp, Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';
import { useFindMoreResource } from '@/hooks/useFindMoreResource';
import { useToast } from '@/hooks/use-toast';

interface Reading {
  url: string;
  domain: string;
  title: string;
  author?: string;
  snippet: string;
  focusHighlight: string;
  embeddedContent?: string;
  contentExtractionStatus?: 'success' | 'partial' | 'failed';
  verified?: boolean;
  archivedUrl?: string;
  directPdfUrl?: string;
  specificReadings?: Array<{
    citation: string;
    url: string;
    type: 'pdf' | 'article' | 'chapter' | 'external';
    verified?: boolean;
    archivedUrl?: string;
  }>;
}

interface ReadingCarouselProps {
  readings: Reading[];
  stepTitle: string;
  discipline: string;
}

export const ReadingCarousel = ({ readings, stepTitle, discipline }: ReadingCarouselProps) => {
  const [expandedContent, setExpandedContent] = useState<Set<number>>(new Set());
  const [api, setApi] = useState<CarouselApi>();
  const [localReadings, setLocalReadings] = useState(readings);
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();

  // Close expanded content when carousel slides change
  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setExpandedContent(new Set());
    };

    api.on("select", handleSelect);

    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);
  
  // Filter to only show verified readings
  const validReadings = localReadings.filter(r => r.url && r.verified !== false);
  
  // Fallback for no valid readings
  if (validReadings.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No verified readings found. Try these authoritative sources:
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(`https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(stepTitle)}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Stanford Encyclopedia
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(stepTitle.replace(/\s+/g, '_'))}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Wikipedia
          </Button>
        </div>
      </Card>
    );
  }

  const toggleContent = (index: number) => {
    setExpandedContent(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleFindMore = async () => {
    try {
      const existingUrls = localReadings.map(r => r.url);
      const result = await findMore('reading', stepTitle, discipline, existingUrls);
      
      // Check if it's an error response
      if (result?.error) {
        toast({
          title: "No New Readings Found",
          description: result.message || "Could not find additional readings that aren't already in your list.",
          variant: "default"
        });
        return;
      }
      
      if (result) {
        setLocalReadings([...localReadings, result]);
        toast({
          title: "Reading Added",
          description: `Added: ${result.title}`,
        });
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: "Could not find additional readings. Try again later.",
        variant: "destructive"
      });
    }
  };

  const getSourceBadgeColor = (domain: string) => {
    if (domain.includes('stanford.edu')) return 'bg-blue-500 text-white';
    if (domain.includes('wikipedia.org')) return 'bg-gray-700 text-white';
    if (domain.includes('gutenberg.org')) return 'bg-green-600 text-white';
    if (domain.includes('archive.org')) return 'bg-orange-600 text-white';
    if (domain.includes('mit.edu')) return 'bg-red-600 text-white';
    return 'bg-primary text-primary-foreground';
  };

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      <Carousel setApi={setApi} className="w-full max-w-full min-w-0 overflow-hidden">
        <CarouselContent className="-ml-2 md:-ml-4">
          {validReadings.map((reading, index) => {
            const isExpanded = expandedContent.has(index);
            const hasEmbeddedContent = reading.embeddedContent && reading.contentExtractionStatus === 'success';

            return (
            <CarouselItem key={index} className="pl-2 md:pl-4 basis-full min-w-0 w-full max-w-full">
              <Card className="border-2 border-border p-6 space-y-4 w-full max-w-full min-w-0 overflow-hidden">
                  {/* Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <Badge className={getSourceBadgeColor(reading.domain)}>
                          {reading.domain}
                        </Badge>
                        <h3 className="font-serif font-semibold text-lg">{reading.title}</h3>
                        {reading.author && (
                          <p className="text-sm text-muted-foreground">By {reading.author}</p>
                        )}
                      </div>
                      {reading.verified === false && (
                        <Badge variant="outline">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {reading.snippet}
                    </p>

                    {reading.focusHighlight && (
                      <div className="border-l-2 border-primary/20 pl-3 py-2">
                        <p className="text-xs font-medium mb-1">Focus:</p>
                        <p className="text-sm text-muted-foreground">{reading.focusHighlight}</p>
                      </div>
                    )}
                  </div>

                  {/* Embedded Content */}
                  {hasEmbeddedContent && (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleContent(index)}
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {isExpanded ? 'Hide' : 'Read'} Article Content
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {isExpanded && (
                        <div className="border-2 border-border rounded p-4 bg-background/50">
                          <div 
                            className="embedded-article-content prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: reading.embeddedContent! }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Extraction Status */}
                  {reading.contentExtractionStatus === 'failed' && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted p-2 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Article content could not be extracted. Please visit the source link.</span>
                    </div>
                  )}

                  {/* Specific Readings */}
                  {reading.specificReadings && reading.specificReadings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Assigned Readings:</p>
                      <div className="space-y-2">
                        {reading.specificReadings.map((specific, i) => (
                          <div key={i} className="text-xs p-2 border border-border rounded space-y-1">
                            <p className="text-foreground">{specific.citation}</p>
                            {specific.url && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => window.open(specific.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open {specific.type === 'pdf' ? 'PDF' : 'Link'}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(reading.directPdfUrl || reading.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {reading.directPdfUrl ? 'Open PDF' : 'Visit Source'}
                    </Button>
                    {reading.author && (
                      <div className="flex-1 flex items-center justify-end text-xs text-muted-foreground">
                        Author: {reading.author}
                      </div>
                    )}
                  </div>

                  {/* Fallback options */}
                  {reading.verified === false && (
                    <ResourceFallback
                      title={reading.title}
                      originalUrl={reading.url}
                      archivedUrl={reading.archivedUrl}
                      searchQuery={`${stepTitle} ${discipline} ${reading.title}`}
                      resourceType="reading"
                    />
                  )}
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {validReadings.length > 1 && (
          <>
            <CarouselPrevious className="-left-4 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
            <CarouselNext className="-right-4 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
          </>
        )}
      </Carousel>
      
      {/* Find More Button */}
      <div className="flex justify-center pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleFindMore}
          disabled={isSearching}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isSearching ? 'Searching...' : 'Find One More Reading'}
        </Button>
      </div>
    </div>
  );
};
