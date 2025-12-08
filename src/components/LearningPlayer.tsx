import { useState, useEffect } from 'react';
import { BookOpen, Loader2, ChevronDown, ChevronRight, Video, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCarousel } from './VideoCarousel';
import { ReadingCarousel } from './ReadingCarousel';
import { MOOCCarousel } from './MOOCCarousel';
import { BookCard } from './BookCard';
import { AlternativeResources } from './AlternativeResources';
import { CapstoneAssignment } from './CapstoneAssignment';
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
  const [currentResources, setCurrentResources] = useState<any>(null);

  // Properly sync currentResources when resources change
  useEffect(() => {
    if (resources) {
      setCurrentResources(resources);
    }
  }, [resources]);

  const handleLoadResources = () => {
    setHasLoaded(true);
    fetchResources(stepTitle, discipline, syllabusUrls, false);
  };

  // For capstone steps, show the assignment interface
  if (isCapstone) {
    return (
      <div className="space-y-6">
        <CapstoneAssignment
          stepTitle={stepTitle}
          discipline={discipline}
          syllabusUrls={syllabusUrls}
        />
      </div>
    );
  }

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

  const displayResources = currentResources || resources;
  const hasAnyContent = 
    (displayResources.videos && displayResources.videos.length > 0) ||
    (displayResources.readings && displayResources.readings.length > 0) ||
    (displayResources.books && displayResources.books.length > 0) ||
    (displayResources.alternatives && displayResources.alternatives.length > 0) ||
    // Backward compatibility
    displayResources.primaryVideo || displayResources.deepReading || displayResources.book;

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
  const moocs = displayResources.alternatives?.filter(alt => alt.type === 'mooc' && alt.url && alt.verified !== false) || [];
  const podcasts = displayResources.alternatives?.filter(alt => alt.type === 'podcast' && alt.url && alt.verified !== false) || [];
  const otherAlternatives = displayResources.alternatives?.filter(alt => alt.type !== 'podcast' && alt.type !== 'mooc' && alt.url && alt.verified !== false) || [];

  const handleAlternativeReplace = (index: number, newResource: any, isPodcast: boolean) => {
    const updatedAlternatives = [...(displayResources.alternatives || [])];
    const actualIndex = isPodcast 
      ? displayResources.alternatives?.findIndex((alt, i) => alt.type === 'podcast' && podcasts.indexOf(alt) === index)
      : displayResources.alternatives?.findIndex((alt, i) => alt.type !== 'podcast' && otherAlternatives.indexOf(alt) === index);
    
    if (actualIndex !== undefined && actualIndex !== -1) {
      updatedAlternatives[actualIndex] = newResource;
      setCurrentResources({ ...displayResources, alternatives: updatedAlternatives });
    }
  };

  // Organize books (if using new array format)
  const booksList = displayResources.books || (displayResources.book ? [displayResources.book] : []);

  return (
    <div className="space-y-3 py-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Video Carousel */}
      {displayResources.videos && displayResources.videos.length > 0 && (() => {
        const verifiedVideos = displayResources.videos.filter(v => v.url && v.verified !== false);
        const label = verifiedVideos.length > 0 ? `(${verifiedVideos.length})` : '(Search)';
        return (
          <Collapsible open={openSections.has('videos')} onOpenChange={() => toggleSection('videos')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.has('videos') ? '' : '-rotate-90'}`} />
              <Video className="h-4 w-4" />
              <span className="font-semibold text-sm">Educational Videos {label}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 w-full max-w-full min-w-0 overflow-hidden">
              <VideoCarousel 
                videos={displayResources.videos}
                stepTitle={stepTitle}
                discipline={discipline}
              />
            </CollapsibleContent>
          </Collapsible>
        );
      })()}

      {/* Reading Carousel */}
      {displayResources.readings && displayResources.readings.length > 0 && (() => {
        const verifiedReadings = displayResources.readings.filter(r => r.url && r.verified !== false);
        const label = verifiedReadings.length > 0 ? `(${verifiedReadings.length})` : '(Search)';
        return (
          <Collapsible open={openSections.has('readings')} onOpenChange={() => toggleSection('readings')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.has('readings') ? '' : '-rotate-90'}`} />
              <FileText className="h-4 w-4" />
              <span className="font-semibold text-sm">Authority Readings {label}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ReadingCarousel 
                readings={displayResources.readings}
                stepTitle={stepTitle}
                discipline={discipline}
              />
            </CollapsibleContent>
          </Collapsible>
        );
      })()}

      {/* Book Resources */}
      {booksList.length > 0 && (
        <Collapsible open={openSections.has('books')} onOpenChange={() => toggleSection('books')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            {openSections.has('books') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm">📚 Recommended Books ({booksList.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {booksList.map((book, index) => (
              <BookCard 
                key={index}
                {...book} 
                isCapstone={isCapstone}
                stepTitle={stepTitle}
                discipline={discipline}
                onReplace={() => {}}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* MOOC Courses */}
      {moocs.length > 0 && (
        <Collapsible open={openSections.has('moocs')} onOpenChange={() => toggleSection('moocs')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.has('moocs') ? '' : '-rotate-90'}`} />
            <GraduationCap className="h-4 w-4" />
            <span className="font-semibold text-sm">Online Courses (MOOCs) ({Math.min(moocs.length, 3)})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <MOOCCarousel 
              moocs={moocs}
              stepTitle={stepTitle}
              discipline={discipline}
            />
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
            <AlternativeResources 
              alternatives={podcasts} 
              isCapstone={isCapstone}
              stepTitle={stepTitle}
              discipline={discipline}
              onReplace={(index, newRes) => handleAlternativeReplace(index, newRes, true)}
            />
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
            <AlternativeResources 
              alternatives={otherAlternatives} 
              isCapstone={isCapstone}
              stepTitle={stepTitle}
              discipline={discipline}
              onReplace={(index, newRes) => handleAlternativeReplace(index, newRes, false)}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
