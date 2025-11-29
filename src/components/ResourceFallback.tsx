import { AlertTriangle, Archive, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResourceFallbackProps {
  title: string;
  originalUrl: string;
  archivedUrl?: string;
  searchQuery: string;
  resourceType: 'video' | 'reading' | 'book' | 'podcast';
}

export const ResourceFallback = ({
  title,
  originalUrl,
  archivedUrl,
  searchQuery,
  resourceType
}: ResourceFallbackProps) => {
  const searchUrls = {
    video: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
    reading: `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}`,
    book: `https://archive.org/search?query=${encodeURIComponent(searchQuery)}`,
    podcast: `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' podcast')}`
  };

  return (
    <Alert className="border-amber-200 bg-amber-50/50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          <strong>{title}</strong> may not be accessible from the original source.
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={originalUrl} target="_blank" rel="noopener noreferrer">
              Try Original <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          
          {archivedUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={archivedUrl} target="_blank" rel="noopener noreferrer">
                <Archive className="mr-1 h-3 w-3" /> Archived Version
              </a>
            </Button>
          )}
          
          <Button variant="secondary" size="sm" asChild>
            <a href={searchUrls[resourceType]} target="_blank" rel="noopener noreferrer">
              <Search className="mr-1 h-3 w-3" /> Search for it
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
