import { ExternalLink, Mic, GraduationCap, Video, FileText, BookOpen, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AlternativeResource {
  type: 'podcast' | 'mooc' | 'video' | 'article' | 'book';
  url: string;
  title: string;
  source: string;
  duration?: string;
  author?: string;
  verified?: boolean;
  archivedUrl?: string;
}

interface AlternativeResourcesProps {
  alternatives: AlternativeResource[];
  isCapstone?: boolean;
}

export const AlternativeResources = ({ alternatives, isCapstone = false }: AlternativeResourcesProps) => {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'podcast':
        return <Mic className="h-5 w-5" />;
      case 'mooc':
        return <GraduationCap className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'article':
        return <FileText className="h-5 w-5" />;
      case 'book':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span>🔄 Alternative Resources</span>
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alternatives.map((resource, idx) => (
          <a
            key={idx}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border p-4 hover:bg-muted/50 transition-colors space-y-3 group"
          >
            {/* Type Icon & Label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2" style={{ color: accentColor }}>
                {getIcon(resource.type)}
                <span className="text-xs font-medium uppercase tracking-wide">
                  {getTypeLabel(resource.type)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {resource.verified === false && (
                  <span title="Link may be outdated">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  </span>
                )}
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>

            {/* Title */}
            <h5 className="font-medium text-sm line-clamp-2 leading-snug">{resource.title}</h5>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {resource.source}
              </Badge>
              {resource.duration && (
                <span>{resource.duration}</span>
              )}
            </div>

            {/* Author if available */}
            {resource.author && (
              <p className="text-xs text-muted-foreground">by {resource.author}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};
