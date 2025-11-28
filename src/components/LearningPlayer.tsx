import { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';
import { ReadingCard } from './ReadingCard';
import { BookCard } from './BookCard';
import { AlternativeResources } from './AlternativeResources';
import { useStepResources } from '@/hooks/useStepResources';

interface LearningPlayerProps {
  stepTitle: string;
  discipline: string;
  syllabusUrls?: string[];
  isCapstone?: boolean;
}

export const LearningPlayer = ({ 
  stepTitle, 
  discipline, 
  syllabusUrls = [],
  isCapstone = false 
}: LearningPlayerProps) => {
  const { resources, isLoading, error, fetchResources } = useStepResources();
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleLoadResources = () => {
    setHasLoaded(true);
    fetchResources(stepTitle, discipline, syllabusUrls, false);
  };

  // Show load button initially
  if (!hasLoaded && !resources) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Learning Resources</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Curated videos, readings, books, and alternative resources for this step
            </p>
          </div>
          <Button onClick={handleLoadResources}>
            Load Learning Resources
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Curating learning resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchResources(stepTitle, discipline, syllabusUrls, true)}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!resources) {
    return null;
  }

  const hasAnyContent = resources.primaryVideo || resources.deepReading || resources.book || (resources.alternatives && resources.alternatives.length > 0);

  if (!hasAnyContent) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No resources found for this step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Primary Video */}
      {resources.primaryVideo && (
        <div>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <span>📺 Primary Video</span>
          </h3>
          <VideoPlayer {...resources.primaryVideo} isCapstone={isCapstone} />
        </div>
      )}

      {/* Deep Reading */}
      {resources.deepReading && (
        <div>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <span>📖 Deep Reading</span>
          </h3>
          <ReadingCard {...resources.deepReading} isCapstone={isCapstone} />
        </div>
      )}

      {/* Book Resource */}
      {resources.book && (
        <div>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <span>📚 Recommended Book</span>
          </h3>
          <BookCard {...resources.book} isCapstone={isCapstone} />
        </div>
      )}

      {/* Alternative Resources */}
      {resources.alternatives && resources.alternatives.length > 0 && (
        <div>
          <AlternativeResources alternatives={resources.alternatives} isCapstone={isCapstone} />
        </div>
      )}
    </div>
  );
};
