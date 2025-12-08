import { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CriticalPath } from './CriticalPath';
import { KnowledgeCheck } from './KnowledgeCheck';
import { ExpansionPack } from './ExpansionPack';
import { CapstoneAssignment } from './CapstoneAssignment';
import { useCuratedResources } from '@/hooks/useCuratedResources';
import { useToast } from '@/hooks/use-toast';

interface CuratedLearningPlayerProps {
  stepTitle: string;
  discipline: string;
  syllabusUrls?: string[];
  rawSourcesContent?: string;
  userTimeBudget?: number;
  isCapstone?: boolean;
}

export const CuratedLearningPlayer = ({ 
  stepTitle, 
  discipline, 
  syllabusUrls = [],
  rawSourcesContent = '',
  userTimeBudget,
  isCapstone = false 
}: CuratedLearningPlayerProps) => {
  const { resources, isLoading, error, fetchResources, findMoreResources } = useCuratedResources();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showExpansion, setShowExpansion] = useState(false);
  const [coreCompleted, setCoreCompleted] = useState(false);
  const { toast } = useToast();

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

  const handleLoadResources = () => {
    setHasLoaded(true);
    fetchResources(stepTitle, discipline, syllabusUrls, rawSourcesContent, userTimeBudget, false);
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

  const handleFindMore = async (type: 'video' | 'reading') => {
    if (!resources) return;
    
    const existingUrls = [
      resources.coreVideo?.url,
      resources.coreReading?.url,
      ...resources.deepDive.map(r => r.url),
      ...resources.expansionPack.map(r => r.url)
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

  // Show load button initially
  if (!hasLoaded && !resources) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Curated Learning Resources</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Get the minimum effective dose: one core video and one core reading, 
              plus optional deep-dive resources.
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
          <p className="text-sm text-muted-foreground">Curating your learning resources...</p>
          <p className="text-xs text-muted-foreground">Finding the minimum effective dose...</p>
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
            onClick={() => fetchResources(stepTitle, discipline, syllabusUrls, rawSourcesContent, userTimeBudget, true)}
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

  const hasCore = resources.coreVideo || resources.coreReading;
  const hasExpansion = resources.deepDive.length > 0 || resources.expansionPack.length > 0;

  if (!hasCore && !hasExpansion) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No resources found for this step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Critical Path - Core Resources */}
      {hasCore && (
        <CriticalPath
          learningObjective={resources.learningObjective}
          coreVideo={resources.coreVideo}
          coreReading={resources.coreReading}
          totalCoreTime={resources.totalCoreTime}
          discipline={discipline}
        />
      )}

      {/* Knowledge Check - Appears after core content */}
      {hasCore && resources.knowledgeCheck && !coreCompleted && (
        <KnowledgeCheck
          question={resources.knowledgeCheck.question}
          onUnderstand={handleUnderstand}
          onNeedMore={handleNeedMore}
        />
      )}

      {/* Expansion Pack - Optional Deep Dive */}
      {hasExpansion && (
        <ExpansionPack
          deepDive={resources.deepDive}
          expansionPack={resources.expansionPack}
          totalExpandedTime={resources.totalExpandedTime}
          onFindMore={handleFindMore}
          isExpanded={showExpansion}
        />
      )}
    </div>
  );
};
