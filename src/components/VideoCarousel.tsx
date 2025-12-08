import { useState } from 'react';
import { ExternalLink, Search, AlertTriangle, Flag, PlusCircle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';
import { useReportResource } from '@/hooks/useReportResource';
import { useFindMoreResource } from '@/hooks/useFindMoreResource';
import { useToast } from '@/hooks/use-toast';

interface Video {
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  duration: string;
  whyThisVideo: string;
  keyMoments?: { time: string; label: string }[];
  verified?: boolean;
  archivedUrl?: string;
}

interface VideoCarouselProps {
  videos: Video[];
  stepTitle: string;
  discipline: string;
}

export const VideoCarousel = ({ videos, stepTitle, discipline }: VideoCarouselProps) => {
  const { reportAndReplace, isReporting } = useReportResource();
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();
  const [localVideos, setLocalVideos] = useState(videos);
  const [isRetrying, setIsRetrying] = useState(false); // Moved to top level to fix React hook violation
  
  // Filter to only show verified videos
  const validVideos = localVideos.filter(v => v.url && v.verified !== false);
  
  const handleReport = async (videoIndex: number) => {
    const video = validVideos[videoIndex];
    const replacement = await reportAndReplace({
      brokenUrl: video.url,
      resourceType: 'video',
      stepTitle,
      discipline,
      reportReason: 'Video not working'
    });
    
    if (replacement?.url) {
      // Replace the broken video with the new one
      const newVideos = [...localVideos];
      const originalIndex = localVideos.findIndex(v => v.url === video.url);
      if (originalIndex !== -1) {
        newVideos[originalIndex] = {
          url: replacement.url,
          title: replacement.title || 'Replacement Video',
          author: replacement.author || 'YouTube',
          thumbnailUrl: replacement.thumbnailUrl || `https://img.youtube.com/vi/${replacement.url.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1]}/maxresdefault.jpg`,
          duration: replacement.duration || '',
          whyThisVideo: replacement.whyThisVideo || 'Replacement educational video',
          verified: true
        };
        setLocalVideos(newVideos);
      }
    }
  };

  const handleFindMore = async () => {
    try {
      const existingUrls = localVideos.map(v => v.url);
      const result = await findMore('video', stepTitle, discipline, existingUrls);
      
      // Check if it's an error response
      if (result?.error) {
        toast({
          title: "No New Videos Found",
          description: result.message || "Could not find additional videos that aren't already in your list.",
          variant: "default"
        });
        return;
      }
      
      if (result) {
        setLocalVideos([...localVideos, result]);
        toast({
          title: "Video Added",
          description: `Added: ${result.title}`,
        });
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: "Could not find additional videos. Try again later.",
        variant: "destructive"
      });
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    window.location.reload();
  };
  
  // If no valid videos, show retry UI
  if (validVideos.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          Video discovery in progress...
        </p>
        <Button 
          variant="default" 
          onClick={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Finding videos...' : 'Retry Video Discovery'}
        </Button>
      </Card>
    );
  }

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <Carousel className="w-full max-w-full min-w-0" opts={{ align: "start" }}>
        <CarouselContent className="-ml-4">
          {validVideos.map((video, index) => {
            const embedUrl = getYouTubeEmbedUrl(video.url);

            return (
              <CarouselItem key={index} className="pl-4 basis-full min-w-0">
                <Card className="border-2 border-border p-4 space-y-3">
                  {/* Flex blowout prevention wrapper */}
                  <div className="w-full max-w-full min-w-0">
                    {/* The Container Cage - strict max width constraint */}
                    <div className="w-full max-w-[800px] mx-auto">
                      {/* Padding Hack: pb-[56.25%] forces 16:9 ratio (9/16 = 0.5625) */}
                      <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-xl overflow-hidden shadow-lg border border-border">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={video.title}
                          className="absolute top-0 left-0 w-full h-full"
                          frameBorder={0}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-muted-foreground">
                          Video unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Video Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-2">{video.title}</h4>
                      {video.verified === false && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{video.author}</p>

                    {video.whyThisVideo && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/20 pl-2">
                        {video.whyThisVideo}
                      </p>
                    )}

                    {/* Key Moments */}
                    {video.keyMoments && video.keyMoments.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Key Moments:</p>
                        <div className="space-y-1">
                          {video.keyMoments.map((moment, i) => (
                            <div key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="font-mono">{moment.time}</span>
                              <span>{moment.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Watch on YouTube
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReport(index)}
                        disabled={isReporting}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {isReporting ? 'Finding replacement...' : 'Report & Replace'}
                      </Button>
                    </div>

                    {/* Fallback options */}
                    {video.verified === false && (
                      <ResourceFallback
                        title={video.title}
                        originalUrl={video.url}
                        archivedUrl={video.archivedUrl}
                        searchQuery={`${stepTitle} ${discipline} ${video.title}`}
                        resourceType="video"
                      />
                    )}
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {validVideos.length > 1 && (
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
          {isSearching ? 'Searching...' : 'Find One More Video'}
        </Button>
      </div>
    </div>
  );
};
