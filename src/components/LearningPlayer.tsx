import { useState } from 'react';
import { BookOpen, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';
import { ReadingCard } from './ReadingCard';
import { BookCard } from './BookCard';
import { AlternativeResources } from './AlternativeResources';
import { useStepResources } from '@/hooks/useStepResources';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Separate alternatives by type
  const podcasts = resources.alternatives?.filter(alt => alt.type === 'podcast') || [];
  const otherAlternatives = resources.alternatives?.filter(alt => alt.type !== 'podcast') || [];

  return (
    <div className="space-y-3 py-6">
      {/* Primary Video */}
      {resources.primaryVideo && (
        <Collapsible open={openSections.has('video')} onOpenChange={() => toggleSection('video')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('video') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">📺 Primary Video (1)</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <VideoPlayer {...resources.primaryVideo} isCapstone={isCapstone} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Deep Reading */}
      {resources.deepReading && (
        <Collapsible open={openSections.has('reading')} onOpenChange={() => toggleSection('reading')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('reading') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">📖 Deep Reading (1)</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ReadingCard {...resources.deepReading} isCapstone={isCapstone} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Book Resource */}
      {resources.book && (
        <Collapsible open={openSections.has('book')} onOpenChange={() => toggleSection('book')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('book') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">📚 Recommended Book (1)</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <BookCard {...resources.book} isCapstone={isCapstone} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Podcasts */}
      {podcasts.length > 0 && (
        <Collapsible open={openSections.has('podcasts')} onOpenChange={() => toggleSection('podcasts')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('podcasts') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">🎧 Podcasts ({podcasts.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <AlternativeResources alternatives={podcasts} isCapstone={isCapstone} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Additional Resources */}
      {otherAlternatives.length > 0 && (
        <Collapsible open={openSections.has('additional')} onOpenChange={() => toggleSection('additional')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('additional') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">🎓 Additional Resources ({otherAlternatives.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <AlternativeResources alternatives={otherAlternatives} isCapstone={isCapstone} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
