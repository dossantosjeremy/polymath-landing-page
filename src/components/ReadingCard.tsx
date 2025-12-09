import { ExternalLink, BookOpen, FileText, AlertTriangle, Archive, Search, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReportResource } from '@/hooks/useReportResource';

interface ReadingCardProps {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  focusHighlight: string;
  favicon?: string;
  isCapstone?: boolean;
  specificReadings?: Array<{
    citation: string;
    url: string;
    type: 'pdf' | 'article' | 'chapter' | 'external';
    verified?: boolean;
    archivedUrl?: string;
  }>;
  verified?: boolean;
  archivedUrl?: string;
  directPdfUrl?: string;
  stepTitle: string;
  discipline: string;
  onReplace?: (newReading: any) => void;
}

export const ReadingCard = ({
  url,
  domain,
  title,
  snippet,
  focusHighlight,
  favicon,
  isCapstone = false,
  specificReadings,
  verified = true,
  archivedUrl,
  directPdfUrl,
  stepTitle,
  discipline,
  onReplace
}: ReadingCardProps) => {
  const { reportAndReplace, isReporting } = useReportResource();
  const accentColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const bgColor = isCapstone ? 'hsl(var(--gold))' : 'hsl(var(--primary))';
  const displayUrl = directPdfUrl || url;
  const showWarning = verified === false;

  const handleReport = async () => {
    const result = await reportAndReplace({
      brokenUrl: url,
      resourceType: 'reading',
      stepTitle,
      discipline,
      reportReason: 'Reading not accessible'
    });

    if (result?.replacement && onReplace) {
      onReplace(result.replacement);
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {favicon ? (
            <img src={favicon} alt="" className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
          )}
          <span className="text-sm font-medium" style={{ color: accentColor }}>{domain}</span>
        </div>
        
        {directPdfUrl && (
          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
            📄 Direct PDF
          </Badge>
        )}
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

      {/* Title */}
      <h4 className="font-semibold text-lg">{title}</h4>

      {/* Snippet */}
      <p className="text-sm text-muted-foreground leading-relaxed">{snippet}</p>

      {/* Specific Readings with Direct Links */}
      {specificReadings && specificReadings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">📚 Required Readings:</p>
          <div className="space-y-1">
            {specificReadings.map((reading, index) => (
              reading.url ? (
                <a 
                  key={index}
                  href={reading.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm hover:underline group"
                  style={{ color: accentColor }}
                >
                  <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="flex-1">{reading.citation}</span>
                  <ExternalLink className="h-3 w-3 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="flex-1">{reading.citation}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

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
          <a href={displayUrl} target="_blank" rel="noopener noreferrer">
            {directPdfUrl ? 'Open PDF' : specificReadings && specificReadings.length > 0 ? 'View All Readings' : 'Read Full Source'} 
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
        
        {showWarning && (
          <Button variant="ghost" size="icon" asChild title="Search for this resource">
            <a 
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`}
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
