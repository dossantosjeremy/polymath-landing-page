import { ExternalLink, Mic, GraduationCap, Video, FileText, BookOpen, AlertTriangle, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReportResource } from '@/hooks/useReportResource';

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
  stepTitle: string;
  discipline: string;
  onReplace?: (index: number, newResource: any) => void;
}

export const AlternativeResources = ({ alternatives, isCapstone = false, stepTitle, discipline, onReplace }: AlternativeResourcesProps) => {
  const { reportAndReplace, isReporting } = useReportResource();
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

  const handleReport = async (resource: AlternativeResource, index: number) => {
    const replacement = await reportAndReplace({
      brokenUrl: resource.url,
      resourceType: resource.type,
      stepTitle,
      discipline,
      reportReason: `${resource.type} not accessible`
    });

    if (replacement && onReplace) {
      onReplace(index, replacement);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span>🔄 Alternative Resources</span>
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alternatives.map((resource, idx) => (
          <div
            key={idx}
            className="border p-4 space-y-3 relative group"
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
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </a>
              </div>
            </div>

            {/* Title */}
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
              <h5 className="font-medium text-sm line-clamp-2 leading-snug hover:underline">{resource.title}</h5>
            </a>

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

            {/* Report button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReport(resource, idx)}
              disabled={isReporting}
              className="w-full"
            >
              <Flag className="h-3 w-3 mr-1" />
              Report broken link
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
