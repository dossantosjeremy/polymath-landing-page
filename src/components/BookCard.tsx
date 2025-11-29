import { ExternalLink, BookMarked, AlertTriangle, Search, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  archivedUrl
}: BookCardProps) => {
  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const bgColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const showWarning = verified === false;

  return (
    <div 
      className="border p-6 space-y-4"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: accentColor,
        backgroundColor: `${bgColor}05`
      }}
    >
      {/* Header Icon */}
      <div className="flex items-center gap-2">
        <BookMarked className="h-5 w-5" style={{ color: accentColor }} />
        <span className="text-sm font-medium" style={{ color: accentColor }}>{source}</span>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 text-amber-600 text-xs">
          <AlertTriangle className="h-3 w-3" />
          <span>Link may be outdated</span>
          {archivedUrl && (
            <a href={archivedUrl} className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
              (view archived)
            </a>
          )}
        </div>
      )}

      {/* Book Info */}
      <div className="space-y-2">
        <h4 className="font-semibold text-lg">{title}</h4>
        <p className="text-sm text-muted-foreground">by {author}</p>
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
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          asChild
          style={{
            borderColor: accentColor,
            color: accentColor
          }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Read Book <ExternalLink className="ml-2 h-4 w-4" />
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
      </div>
    </div>
  );
};
