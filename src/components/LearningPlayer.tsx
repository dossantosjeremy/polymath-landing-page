import { useState, useEffect } from 'react';
import { BookOpen, Loader2, ChevronDown, ChevronRight, Video, FileText, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCarousel } from './VideoCarousel';
import { ReadingCarousel } from './ReadingCarousel';
import { MOOCCarousel } from './MOOCCarousel';
import { BookCard } from './BookCard';
import { AlternativeResources } from './AlternativeResources';
import { CapstoneAssignment } from './CapstoneAssignment';
import { CriticalPath } from './CriticalPath';
import { KnowledgeCheck } from './KnowledgeCheck';
import { ExpansionPack } from './ExpansionPack';
import { useStepResources } from '@/hooks/useStepResources';
import { useCuratedResources, CuratedStepResources } from '@/hooks/useCuratedResources';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface LearningPlayerProps {
  stepTitle: string;
  discipline: string;
  syllabusUrls?: string[];
  rawSourcesContent?: string;
  userTimeBudget?: number;
  isCapstone?: boolean;
}

export const LearningPlayer = ({ 
  stepTitle, 
  discipline, 
  syllabusUrls = [],
  rawSourcesContent = '',
  userTimeBudget,
  isCapstone = false 
}: LearningPlayerProps) => {
  const { resources: legacyResources, isLoading: legacyLoading, error: legacyError, fetchResources: fetchLegacy } = useStepResources();
  const { resources: curatedResources, isLoading: curatedLoading, error: curatedError, fetchResources: fetchCurated, findMoreResources } = useCuratedResources();
  
  const [hasLoaded, setHasLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'curated' | 'all'>('curated');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [currentResources, setCurrentResources] = useState<any>(null);
  const [showExpansion, setShowExpansion] = useState(false);
  const [coreCompleted, setCoreCompleted] = useState(false);
  const { toast } = useToast();

  // Properly sync currentResources when resources change
  useEffect(() => {
    if (legacyResources) {
      setCurrentResources(legacyResources);
    }
  }, [legacyResources]);

  const handleLoadResources = () => {
    setHasLoaded(true);
    // Fetch both formats in parallel
    fetchCurated(stepTitle, discipline, syllabusUrls, rawSourcesContent, userTimeBudget, false);
    fetchLegacy(stepTitle, discipline, syllabusUrls, false);
  };

  const handleUnderstand = () => {
    setCoreCompleted(true);
    toast({
      title: "Great progress!",
      description: "You've completed the core content. Feel free to explore additional resources below.",
    });
  };

  const handleNeedMore = () => {
    setShowExpansion(true);
    toast({
      title: "No problem!",
      description: "We've expanded the supplemental resources for you.",
    });
  };

  const handleFindMore = async (type: 'video' | 'reading' | 'podcast') => {
    if (!curatedResources) return;
    
    const existingUrls = [
      curatedResources.coreVideo?.url,
      curatedResources.coreReading?.url,
      ...curatedResources.deepDive.map(r => r.url),
      ...curatedResources.expansionPack.map(r => r.url)
    ].filter(Boolean) as string[];

    try {
      await findMoreResources(stepTitle, discipline, type, existingUrls);
      toast({
        title: `Found more ${type}s!`,
        description: "New resource added to the expansion pack.",
      });
    } catch (err) {
      toast({
        title: "Search complete",
        description: `No additional ${type}s found for this topic.`,
        variant: "destructive"
      });
    }
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
  if (!hasLoaded && !legacyResources && !curatedResources) {
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

  const isLoading = curatedLoading || legacyLoading;
  const error = curatedError || legacyError;

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

  if (error && !curatedResources && !legacyResources) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchCurated(stepTitle, discipline, syllabusUrls, rawSourcesContent, userTimeBudget, true);
              fetchLegacy(stepTitle, discipline, syllabusUrls, true);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Determine what content we have
  const hasCuratedContent = curatedResources && (curatedResources.coreVideo || curatedResources.coreReading);
  const displayResources = currentResources || legacyResources;
  
  const hasLegacyContent = displayResources && (
    (displayResources.videos && displayResources.videos.length > 0) ||
    (displayResources.readings && displayResources.readings.length > 0) ||
    (displayResources.books && displayResources.books.length > 0) ||
    (displayResources.alternatives && displayResources.alternatives.length > 0) ||
    displayResources.primaryVideo || displayResources.deepReading || displayResources.book
  );

  if (!hasCuratedContent && !hasLegacyContent) {
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

  // Separate alternatives by type for legacy view
  const moocs = displayResources?.alternatives?.filter((alt: any) => alt.type === 'mooc' && alt.url && alt.verified !== false) || [];
  const podcasts = displayResources?.alternatives?.filter((alt: any) => alt.type === 'podcast' && alt.url && alt.verified !== false) || [];
  const otherAlternatives = displayResources?.alternatives?.filter((alt: any) => alt.type !== 'podcast' && alt.type !== 'mooc' && alt.url && alt.verified !== false) || [];

  const handleAlternativeReplace = (index: number, newResource: any, isPodcast: boolean) => {
    const updatedAlternatives = [...(displayResources.alternatives || [])];
    const actualIndex = isPodcast 
      ? displayResources.alternatives?.findIndex((alt: any, i: number) => alt.type === 'podcast' && podcasts.indexOf(alt) === index)
      : displayResources.alternatives?.findIndex((alt: any, i: number) => alt.type !== 'podcast' && otherAlternatives.indexOf(alt) === index);
    
    if (actualIndex !== undefined && actualIndex !== -1) {
      updatedAlternatives[actualIndex] = newResource;
      setCurrentResources({ ...displayResources, alternatives: updatedAlternatives });
    }
  };

  const booksList = displayResources?.books || (displayResources?.book ? [displayResources.book] : []);

  return (
    <div className="space-y-4 py-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'curated' | 'all')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="curated" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Essential Path
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All Resources
          </TabsTrigger>
        </TabsList>

        {/* Curated View - Minimum Effective Dose */}
        <TabsContent value="curated" className="space-y-6 mt-4">
          {curatedResources && (
            <>
              {/* Critical Path - Core Resources */}
              {(curatedResources.coreVideo || curatedResources.coreReading) && (
                <CriticalPath
                  learningObjective={curatedResources.learningObjective}
                  coreVideo={curatedResources.coreVideo}
                  coreReading={curatedResources.coreReading}
                  totalCoreTime={curatedResources.totalCoreTime}
                  discipline={discipline}
                  stepTitle={stepTitle}
                />
              )}

              {/* Knowledge Check */}
              {curatedResources.knowledgeCheck && !coreCompleted && (
                <KnowledgeCheck
                  question={curatedResources.knowledgeCheck.question}
                  onUnderstand={handleUnderstand}
                  onNeedMore={handleNeedMore}
                />
              )}

              {/* Expansion Pack */}
              {(curatedResources.deepDive.length > 0 || curatedResources.expansionPack.length > 0) && (
                <ExpansionPack
                  deepDive={curatedResources.deepDive}
                  expansionPack={curatedResources.expansionPack}
                  totalExpandedTime={curatedResources.totalExpandedTime}
                  onFindMore={handleFindMore}
                  isExpanded={showExpansion}
                  stepTitle={stepTitle}
                  discipline={discipline}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* All Resources View - Legacy Format */}
        <TabsContent value="all" className="space-y-3 mt-4">
          {/* Video Carousel */}
          {displayResources?.videos && displayResources.videos.length > 0 && (() => {
            const verifiedVideos = displayResources.videos.filter((v: any) => v.url && v.verified !== false);
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
          {displayResources?.readings && displayResources.readings.length > 0 && (() => {
            const verifiedReadings = displayResources.readings.filter((r: any) => r.url && r.verified !== false);
            const label = verifiedReadings.length > 0 ? `(${verifiedReadings.length})` : '(Search)';
            return (
              <Collapsible open={openSections.has('readings')} onOpenChange={() => toggleSection('readings')}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:text-primary transition-colors">
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.has('readings') ? '' : '-rotate-90'}`} />
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold text-sm">Authority Readings {label}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 w-full max-w-full min-w-0 overflow-hidden">
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
              <CollapsibleContent className="pt-3 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
                {booksList.map((book: any, index: number) => (
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
              <CollapsibleContent className="pt-3 w-full max-w-full min-w-0 overflow-hidden">
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
              <CollapsibleContent className="pt-3 w-full max-w-full min-w-0 overflow-hidden">
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
              <CollapsibleContent className="pt-3 w-full max-w-full min-w-0 overflow-hidden">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
