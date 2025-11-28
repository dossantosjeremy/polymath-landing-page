import { ExternalLink, BookMarked } from 'lucide-react';
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
}

export const BookCard = ({
  title,
  author,
  url,
  source,
  chapterRecommendation,
  why,
  isCapstone = false
}: BookCardProps) => {
  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const bgColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';

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

      {/* CTA Button */}
      <Button
        variant="outline"
        className="w-full"
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
    </div>
  );
};
