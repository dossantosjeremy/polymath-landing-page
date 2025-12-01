import { useState } from 'react';
import { ExternalLink, Search, AlertTriangle, Flag } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';
import { useReportResource } from '@/hooks/useReportResource';

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
  const [localVideos, setLocalVideos] = useState(videos);
  
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
  
  // If no valid videos, show retry UI
  if (validVideos.length === 0) {
    const [isRetrying, setIsRetrying] = useState(false);
    
    const handleRetry = () => {
      setIsRetrying(true);
      // Reload the page to trigger a fresh video hunt
      window.location.reload();
    };
    
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
    <div className="space-y-4">
      <Carousel className="w-full px-12">
        <CarouselContent>
          {validVideos.map((video, index) => {
            const embedUrl = getYouTubeEmbedUrl(video.url);

            return (
              <CarouselItem key={index}>
                <Card className="border-2 border-border p-4 space-y-3">
                  {/* Embedded Video */}
                  <div className="aspect-video">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={video.title}
                        className="w-full h-full rounded"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Unable to embed video</p>
                      </div>
                    )}
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
            <CarouselPrevious className="left-2 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
            <CarouselNext className="right-2 h-10 w-10 bg-background/95 hover:bg-background shadow-lg border-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};
