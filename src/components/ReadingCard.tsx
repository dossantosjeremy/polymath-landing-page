import { ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReadingCardProps {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  focusHighlight: string;
  favicon?: string;
  isCapstone?: boolean;
}

export const ReadingCard = ({
  url,
  domain,
  title,
  snippet,
  focusHighlight,
  favicon,
  isCapstone = false
}: ReadingCardProps) => {
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
      {/* Header */}
      <div className="flex items-center gap-2">
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4" />
        ) : (
          <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
        )}
        <span className="text-sm font-medium" style={{ color: accentColor }}>{domain}</span>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-lg">{title}</h4>

      {/* Snippet */}
      <p className="text-sm text-muted-foreground leading-relaxed">{snippet}</p>

      {/* Focus Highlight */}
      <div 
        className="p-3 border-l-2"
        style={{
          borderLeftColor: accentColor,
          backgroundColor: `${bgColor}10`
        }}
      >
        <p className="text-sm font-medium">📌 Focus: {focusHighlight}</p>
      </div>

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
          Read Full Source <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
  );
};
