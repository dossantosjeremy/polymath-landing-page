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
    const result = await reportAndReplace({
      brokenUrl: video.url,
      resourceType: 'video',
      stepTitle,
      discipline,
      reportReason: 'Video not working'
    });
    
    if (result?.replacement?.url) {
      // Replace the broken video with the new one
      const newVideos = [...localVideos];
      const originalIndex = localVideos.findIndex(v => v.url === video.url);
      if (originalIndex !== -1) {
        newVideos[originalIndex] = {
          url: result.replacement.url,
          title: result.replacement.title || 'Replacement Video',
          author: result.replacement.author || 'YouTube',
          thumbnailUrl: result.replacement.thumbnailUrl || `https://img.youtube.com/vi/${result.replacement.url.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1]}/maxresdefault.jpg`,
          duration: result.replacement.duration || '',
          whyThisVideo: result.replacement.whyThisVideo || 'Replacement educational video',
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
    <div className="w-full max-w-full min-w-0 overflow-x-hidden box-border">
      <Carousel className="w-full max-w-full min-w-0" opts={{ align: "start" }}>
        <CarouselContent className="-ml-2 sm:-ml-4">
          {validVideos.map((video, index) => {
            const embedUrl = getYouTubeEmbedUrl(video.url);

            return (
              <CarouselItem key={index} className="pl-2 sm:pl-4 basis-full min-w-0">
                <Card className="border-2 border-border p-3 sm:p-4 space-y-3 w-full max-w-full overflow-hidden">
                  {/* Video embed wrapper */}
                  <div className="w-full max-w-full">
                    {/* Aspect ratio container for 16:9 */}
                    <div className="relative w-full aspect-video bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-lg border border-border">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={video.title}
                          className="absolute inset-0 w-full h-full"
                          frameBorder={0}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-muted-foreground">
                          Video unavailable
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 min-w-0 break-words">{video.title}</h4>
                      {video.verified === false && (
                        <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{video.author}</p>

                    {video.whyThisVideo && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/20 pl-2 break-words">
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
                              <span className="font-mono shrink-0">{moment.time}</span>
                              <span className="break-words">{moment.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions - stack on mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none text-xs"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        <span className="truncate">Watch on YouTube</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none text-xs"
                        onClick={() => handleReport(index)}
                        disabled={isReporting}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        <span className="truncate">{isReporting ? 'Finding...' : 'Report'}</span>
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
          disabled={isSearching}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isSearching ? 'Searching...' : 'Find One More Video'}
        </Button>
      </div>
    </div>
  );
};
