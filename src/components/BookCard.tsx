import { ExternalLink, BookMarked, AlertTriangle, Search, Archive, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReportResource } from '@/hooks/useReportResource';

interface BookCardProps {
  title: string;
  author: string;
  url: string;
  source: string;
  chapterRecommendation?: string;
  why: string;
  isCapstone?: boolean;
  verified?: boolean;
  archivedUrl?: string;
  stepTitle: string;
  discipline: string;
  onReplace?: (newBook: any) => void;
}

export const BookCard = ({
  title,
  author,
  url,
  source,
  chapterRecommendation,
  why,
  isCapstone = false,
  verified = true,
  archivedUrl,
  stepTitle,
  discipline,
  onReplace
}: BookCardProps) => {
  const { reportAndReplace, isReporting } = useReportResource();
  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const bgColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const showWarning = verified === false;

  const handleReport = async () => {
    const result = await reportAndReplace({
      brokenUrl: url,
      resourceType: 'book',
      stepTitle,
      discipline,
      reportReason: 'Book link not accessible'
    });

    if (result?.replacement && onReplace) {
      onReplace(result.replacement);
    }
  };

  return (
    <div 
      className="border p-3 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-full min-w-0 overflow-hidden"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: accentColor,
        backgroundColor: `${bgColor}05`
      }}
    >
      {/* Header Icon */}
      <div className="flex items-center gap-2">
        <BookMarked className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: accentColor }} />
        <span className="text-xs sm:text-sm font-medium truncate" style={{ color: accentColor }}>{source}</span>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 text-amber-600 text-xs flex-wrap">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>Link may be outdated</span>
          {archivedUrl && (
            <a href={archivedUrl} className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
              (view archived)
            </a>
          )}
        </div>
      )}

      {/* Book Info */}
      <div className="space-y-1 sm:space-y-2">
        <h4 className="font-semibold text-base sm:text-lg break-words">{title}</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">by {author}</p>
      </div>

      {/* Why Badge */}
      <Badge 
        variant="secondary" 
        className="text-xs"
        style={{ 
          backgroundColor: `${accentColor}15`,
          color: accentColor,
          borderColor: accentColor
        }}
      >
        📚 {why}
      </Badge>

      {/* Chapter Recommendation */}
      {chapterRecommendation && (
        <div 
          className="p-3 border-l-2"
          style={{
            borderLeftColor: accentColor,
            backgroundColor: `${bgColor}10`
          }}
        >
          <p className="text-sm font-medium">📖 Recommended: {chapterRecommendation}</p>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 text-xs sm:text-sm"
          asChild
          style={{
            borderColor: accentColor,
            color: accentColor
          }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
            <span className="truncate">Read Book</span> <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          </a>
        </Button>
        
        {showWarning && (
          <Button variant="ghost" size="icon" asChild title="Search for this book">
            <a 
              href={`https://archive.org/search?query=${encodeURIComponent(title + ' ' + author)}`}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Search className="h-4 w-4" />
            </a>
          </Button>
        )}
        
        {archivedUrl && !showWarning && (
          <Button variant="ghost" size="icon" asChild title="View archived version">
            <a href={archivedUrl} target="_blank" rel="noopener noreferrer">
              <Archive className="h-4 w-4" />
            </a>
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleReport}
          disabled={isReporting}
          title="Report broken link & find replacement"
        >
          <Flag className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
