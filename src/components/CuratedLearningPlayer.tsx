import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CriticalPath } from './CriticalPath';
import { KnowledgeCheck } from './KnowledgeCheck';
import { ExpansionPack } from './ExpansionPack';
import { CapstoneAssignment } from './CapstoneAssignment';
import { useCuratedResources } from '@/hooks/useCuratedResources';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CuratedLearningPlayerProps {
  stepTitle: string;
  discipline: string;
  syllabusUrls?: string[];
  rawSourcesContent?: string;
  userTimeBudget?: number;
  isCapstone?: boolean;
}

interface LoadingStage {
  id: string;
  label: string;
  description: string;
  estimatedSeconds: number;
}

const LOADING_STAGES: LoadingStage[] = [
  { id: 'cache', label: 'Checking Cache', description: 'Looking for cached resources...', estimatedSeconds: 2 },
  { id: 'videos', label: 'Discovering Videos', description: 'Searching YouTube for educational content...', estimatedSeconds: 5 },
  { id: 'readings', label: 'Finding Readings', description: 'Locating authoritative articles...', estimatedSeconds: 4 },
  { id: 'verify', label: 'Verifying Resources', description: 'Validating links and quality...', estimatedSeconds: 3 },
  { id: 'curate', label: 'Curating Results', description: 'Selecting the best resources for you...', estimatedSeconds: 2 },
];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
};

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
  const [loadingStage, setLoadingStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  
  // Progress through stages based on elapsed time
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0);
      setElapsedTime(0);
      return;
    }
    
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(timeInterval);
    };
  }, [isLoading]);

  // Update stage based on elapsed time
  useEffect(() => {
    if (!isLoading) return;
    
    let accumulatedTime = 0;
    for (let i = 0; i < LOADING_STAGES.length; i++) {
      accumulatedTime += LOADING_STAGES[i].estimatedSeconds;
      if (elapsedTime < accumulatedTime) {
        setLoadingStage(i);
        break;
      }
    }
    // If we've exceeded total time, stay on last stage
    const totalEstimatedTime = LOADING_STAGES.reduce((sum, s) => sum + s.estimatedSeconds, 0);
    if (elapsedTime >= totalEstimatedTime) {
      setLoadingStage(LOADING_STAGES.length - 1);
    }
  }, [elapsedTime, isLoading]);

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
    const totalEstimatedTime = LOADING_STAGES.reduce((sum, s) => sum + s.estimatedSeconds, 0);
    const isOvertime = elapsedTime > totalEstimatedTime;
    const overallProgress = isOvertime 
      ? 95 + (4 * (1 - Math.exp(-(elapsedTime - totalEstimatedTime) / 30)))
      : Math.min(95, (elapsedTime / totalEstimatedTime) * 100);
    const estimatedRemaining = Math.max(0, totalEstimatedTime - elapsedTime);
    const currentStage = LOADING_STAGES[loadingStage];
    
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        {/* Stage steps indicator */}
        <div className="flex items-center gap-1 md:gap-2">
          {LOADING_STAGES.map((stage, idx) => (
            <div key={stage.id} className="flex items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  idx < loadingStage 
                    ? "bg-primary text-primary-foreground" 
                    : idx === loadingStage 
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                      : "bg-muted text-muted-foreground"
                )}
              >
                {idx < loadingStage ? (
                  <Check className="h-4 w-4" />
                ) : idx === loadingStage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < LOADING_STAGES.length - 1 && (
                <div 
                  className={cn(
                    "w-4 md:w-6 h-0.5 transition-colors duration-300",
                    idx < loadingStage ? "bg-primary" : "bg-muted"
                  )} 
                />
              )}
            </div>
          ))}
        </div>

        {/* Current stage info */}
        <div className="text-center space-y-2 max-w-md">
          <span className="text-xs text-muted-foreground">
            Step {loadingStage + 1} of {LOADING_STAGES.length}
          </span>
          <h3 className="text-lg font-semibold">{currentStage.label}</h3>
          <p className="text-sm text-muted-foreground">{currentStage.description}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Elapsed: {formatTime(elapsedTime)}</span>
            {isOvertime ? (
              <span className="animate-pulse">Still working...</span>
            ) : (
              <span>Est. remaining: ~{formatTime(estimatedRemaining)}</span>
            )}
          </div>
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
