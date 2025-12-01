import { useState } from 'react';
import { Video, ExternalLink, Clock, Search, Play, AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Filter to only show verified videos
  const validVideos = videos.filter(v => v.url && v.verified !== false);
  
  // If no valid videos, show search fallback
  if (validVideos.length === 0) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${discipline} ${stepTitle}`)}`;
    return (
      <Card className="p-8 text-center border-dashed">
        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No verified videos found for this topic.
        </p>
        <Button variant="outline" onClick={() => window.open(searchUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Search on YouTube
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
      <Carousel className="w-full">
        <CarouselContent>
          {validVideos.map((video, index) => {
            const isExpanded = expandedIndex === index;
            const embedUrl = getYouTubeEmbedUrl(video.url);

            return (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <Card className="border-2 border-border p-4 space-y-3">
                  {/* Thumbnail or Expanded Player */}
                  {!isExpanded ? (
                    <div 
                      className="relative aspect-video bg-muted rounded cursor-pointer group overflow-hidden"
                      onClick={() => setExpandedIndex(index)}
                    >
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <Play className="h-12 w-12 text-white" fill="white" />
                      </div>
                      {video.duration && (
                        <Badge className="absolute bottom-2 right-2 bg-black text-white">
                          {video.duration}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
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
                  )}

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
                      {isExpanded && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedIndex(null)}
                        >
                          Collapse
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Watch on YouTube
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
        {videos.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </div>
  );
};
