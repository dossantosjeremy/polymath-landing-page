import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VideoPlayerProps {
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  duration: string;
  whyThisVideo: string;
  keyMoments?: { time: string; label: string }[];
  isCapstone?: boolean;
}

export const VideoPlayer = ({
  url,
  title,
  author,
  thumbnailUrl,
  duration,
  whyThisVideo,
  keyMoments,
  isCapstone = false
}: VideoPlayerProps) => {
  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeId(url);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  const handleKeyMomentClick = (time: string) => {
    // Parse time and convert to seconds for YouTube timestamp
    const parts = time.split(':').map(Number);
    const seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
    const timestampUrl = `${url}${url.includes('?') ? '&' : '?'}t=${seconds}s`;
    window.open(timestampUrl, '_blank');
  };

  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';

  return (
    <div className="space-y-4">
      {/* Video Embed */}
      {embedUrl ? (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-muted">
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Video Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{title}</h4>
            <p className="text-sm text-muted-foreground">by {author} • {duration}</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <ExternalLink className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </a>
        </div>

        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ 
            backgroundColor: `${accentColor}15`,
            color: accentColor,
            borderColor: accentColor
          }}
        >
          ✨ {whyThisVideo}
        </Badge>
      </div>

      {/* Key Moments */}
      {keyMoments && keyMoments.length > 0 && (
        <div className="pt-2 border-t">
          <h5 className="font-semibold text-sm mb-2">Key Moments</h5>
          <ul className="space-y-1">
            {keyMoments.map((moment, idx) => (
              <li key={idx}>
                <button
                  onClick={() => handleKeyMomentClick(moment.time)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left w-full"
                  style={{ 
                    '--hover-color': accentColor 
                  } as React.CSSProperties}
                >
                  <span className="font-mono" style={{ color: accentColor }}>{moment.time}</span> - {moment.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
