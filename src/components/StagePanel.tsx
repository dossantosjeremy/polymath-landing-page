import { MapPin, Sparkles, BookOpen, Award, ExternalLink, Target, Lightbulb, Eye, Play, PenTool, Compass, ClipboardCheck, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MissionControlStep, ViewMode, PedagogicalFunction, CognitiveLevel } from "@/hooks/useMissionControl";
import { NarrativeLearningContent } from "@/components/NarrativeLearningContent";
import { CuratedLearningPlayer } from "@/components/CuratedLearningPlayer";
import { CapstoneAssignment } from "@/components/CapstoneAssignment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCuratedResources } from "@/hooks/useCuratedResources";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
interface StagePanelProps {
  mode: ViewMode;
  currentStep: MissionControlStep | null;
  confirmedSteps: MissionControlStep[];
  activeStepIndex: number | null;
  discipline: string;
  syllabusUrls: string[];
  stats: {
    total: number;
    selected: number;
    estimatedHours: number;
  };
  rawSources?: Array<{ url: string; courseName?: string; content?: string }>;
  getDomainShortName: (url: string) => string;
  extractCourseCode: (url: string, courseName?: string) => string;
  getSourceColorByUrl: (url: string) => string;
}

// Pedagogical function configuration
const PEDAGOGICAL_CONFIG: Record<PedagogicalFunction, { label: string; description: string; className: string; icon: typeof Eye }> = {
  pre_exposure: { 
    label: 'Preview', 
    description: 'Activating prior knowledge and preparing your mental framework',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Eye 
  },
  concept_exposition: { 
    label: 'Concept Exposition', 
    description: 'Deep dive into core concepts and theoretical foundations',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: BookOpen 
  },
  expert_demonstration: { 
    label: 'Expert Demonstration', 
    description: 'Learning from expert examples and real-world applications',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Play 
  },
  guided_practice: { 
    label: 'Guided Practice', 
    description: 'Applying concepts with structured guidance and feedback',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: PenTool 
  },
  independent_practice: { 
    label: 'Independent Practice', 
    description: 'Self-directed application to solidify understanding',
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    icon: Compass 
  },
  assessment_checkpoint: { 
    label: 'Assessment Checkpoint', 
    description: 'Evaluating mastery and identifying gaps',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: ClipboardCheck 
  },
};

// Bloom's cognitive level labels
const COGNITIVE_LEVELS: CognitiveLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const COGNITIVE_LABELS: Record<CognitiveLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyze: 'Analyze',
  evaluate: 'Evaluate',
  create: 'Create',
};

// Sub-component for Narrative-First Content Area
function NarrativeContentArea({
  isCapstone,
  currentStep,
  discipline,
  syllabusUrls,
  rawSources,
  urls,
}: {
  isCapstone: boolean;
  currentStep: MissionControlStep;
  discipline: string;
  syllabusUrls: string[];
  rawSources: Array<{ url: string; courseName?: string; content?: string }>;
  urls: string[];
}) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const { resources, fetchResources, isLoading: resourcesLoading } = useCuratedResources();

  // Fetch resources for embedding in narrative
  useEffect(() => {
    if (!isCapstone && currentStep.title) {
      fetchResources(currentStep.title, discipline, syllabusUrls, '', undefined, false);
    }
  }, [currentStep.title, discipline, syllabusUrls, isCapstone, fetchResources]);

  const sourceContent = (() => {
    const relevantSources = rawSources.filter(s => urls.includes(s.url));
    return relevantSources
      .map(s => s.content && s.content !== '[[EXTRACTION_FAILED]]' ? s.content : '')
      .filter(Boolean)
      .join('\n\n---\n\n');
  })();

  if (isCapstone) {
    return (
      <div className="w-full min-w-0 overflow-hidden">
        <CapstoneAssignment
          stepTitle={currentStep.title}
          discipline={discipline}
          syllabusUrls={syllabusUrls}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden space-y-6">
      {/* PRIMARY: AI Course Notes with Interwoven Resources */}
      <NarrativeLearningContent
        stepTitle={currentStep.title}
        discipline={discipline}
        stepDescription={currentStep.description || ""}
        sourceContent={sourceContent}
        learningObjective={currentStep.learningObjective}
        pedagogicalFunction={currentStep.pedagogicalFunction}
        cognitiveLevel={currentStep.cognitiveLevel}
        narrativePosition={currentStep.narrativePosition}
        evidenceOfMastery={currentStep.evidenceOfMastery}
        resources={resources ? {
          coreVideos: resources.coreVideos,
          coreReadings: resources.coreReadings,
        } : undefined}
        autoLoad={true}
      />

      {/* SECONDARY: Collapsible Supporting Resources */}
      <Collapsible open={resourcesOpen} onOpenChange={setResourcesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Supporting Resources & Online Courses</span>
            {resources && (
              <Badge variant="secondary" className="text-xs">
                {(resources.coreVideos?.length || 0) + (resources.coreReadings?.length || 0) + (resources.moocs?.length || 0)} items
              </Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            resourcesOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <CuratedLearningPlayer 
            key={currentStep.title}
            stepTitle={currentStep.title}
            discipline={discipline}
            syllabusUrls={syllabusUrls}
            isCapstone={false}
            autoLoad={true}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function StagePanel({
  mode,
  currentStep,
  confirmedSteps,
  activeStepIndex,
  discipline,
  syllabusUrls,
  stats,
  rawSources = [],
  getDomainShortName,
  extractCourseCode,
  getSourceColorByUrl,
}: StagePanelProps) {
  const { t } = useTranslation();
  // Draft Mode: Show placeholder
  if (mode === 'draft') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">{t('learning.planJourney')}</h2>
          
          <p className="text-muted-foreground mb-6">
            {t('learning.planJourneyDesc')}
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('learning.currentlySelected')}</span>
              <span className="font-semibold">{t('learning.stepsCount', { selected: stats.selected, total: stats.total })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('learning.estimatedTime')}</span>
              <span className="font-semibold">{t('learning.hoursAmount', { hours: stats.estimatedHours })}</span>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>{t('learning.resourcesGenerated')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Active Mode: No step selected
  if (!currentStep) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('learning.selectStep')}</h2>
          <p className="text-muted-foreground">
            {t('learning.selectStepDesc')}
          </p>
        </div>
      </div>
    );
  }

  const isCapstone = currentStep.isCapstone || currentStep.tag === 'Capstone Integration';
  const urls = currentStep.sourceUrls || (currentStep.sourceUrl ? [currentStep.sourceUrl] : []);
  const pedagogicalConfig = currentStep.pedagogicalFunction 
    ? PEDAGOGICAL_CONFIG[currentStep.pedagogicalFunction as PedagogicalFunction] 
    : null;
  const currentCognitiveIndex = currentStep.cognitiveLevel 
    ? COGNITIVE_LEVELS.indexOf(currentStep.cognitiveLevel as CognitiveLevel)
    : -1;

  // Active Mode: Show current step content
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden box-border">
        {/* Step Header */}
        <div className={cn(
          "p-3 sm:p-6 rounded-lg border-l-4",
          isCapstone
            ? "bg-[hsl(var(--gold))]/5 border-l-[hsl(var(--gold))]"
            : currentStep.isAIDiscovered
              ? "bg-violet-50/50 border-l-violet-400 dark:bg-violet-950/20"
              : "bg-primary/5 border-l-primary"
        )}>
          <div className="flex items-start gap-3 mb-4">
            {isCapstone ? (
              <Award className="h-6 w-6 text-[hsl(var(--gold))] flex-shrink-0 mt-1" />
            ) : currentStep.isAIDiscovered ? (
              <Sparkles className="h-6 w-6 text-violet-500 flex-shrink-0 mt-1" />
            ) : (
              <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            )}
            <div className="min-w-0 flex-1">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Pedagogical Function Badge */}
                {pedagogicalConfig && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded inline-flex items-center gap-1",
                    pedagogicalConfig.className
                  )}>
                    <pedagogicalConfig.icon className="h-3 w-3" />
                    {pedagogicalConfig.label}
                  </span>
                )}
                
                {/* AI Discovered Badge */}
                {currentStep.isAIDiscovered && (
                  <Badge 
                    variant="outline" 
                    className="text-xs border-violet-300 text-violet-600 dark:border-violet-400 dark:text-violet-400 gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('learning.aiDiscovered')}
                  </Badge>
                )}

                {/* Module/Pillar Badge */}
                {currentStep.pillar && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    isCapstone
                      ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]"
                      : "bg-primary/10 text-primary"
                  )}>
                    {currentStep.pillar}
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-xl font-bold mb-1 break-words">{currentStep.title}</h1>
            </div>
          </div>

          {currentStep.description && (
            <p className="text-muted-foreground mb-4 break-words">{currentStep.description}</p>
          )}

          {/* Learning Objective */}
          {currentStep.learningObjective && (
            <div className="bg-background/50 rounded-lg p-3 mb-4 border border-border/50">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Learning Objective</p>
                  <p className="text-sm">{currentStep.learningObjective}</p>
                </div>
              </div>
            </div>
          )}

          {/* Narrative Position (Why this, why now) */}
          {currentStep.narrativePosition && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 mb-4 border border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Why this, why now</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{currentStep.narrativePosition}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cognitive Level Indicator */}
          {currentCognitiveIndex >= 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Cognitive Depth</p>
              <div className="flex items-center gap-1">
                {COGNITIVE_LEVELS.map((level, idx) => (
                  <div
                    key={level}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-colors",
                      idx <= currentCognitiveIndex
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                    title={COGNITIVE_LABELS[level]}
                  />
                ))}
              </div>
              <p className="text-xs text-primary mt-1 font-medium">
                {COGNITIVE_LABELS[currentStep.cognitiveLevel as CognitiveLevel]}
              </p>
            </div>
          )}

          {/* Source Badges */}
          {urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {urls.filter(Boolean).map((url, idx) => {
                const source = rawSources.find(s => s.url === url);
                const baseName = getDomainShortName(url);
                const courseSuffix = extractCourseCode(url, source?.courseName || '');
                const label = courseSuffix ? `${baseName} (${courseSuffix})` : baseName;

                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-xs px-2 py-1 border inline-flex items-center gap-1 hover:opacity-80 transition-opacity rounded",
                      getSourceColorByUrl(url)
                    )}
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap break-words">
          <span className="whitespace-nowrap">{t('learning.stepOf', { current: (activeStepIndex ?? 0) + 1, total: confirmedSteps.length })}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${((activeStepIndex ?? 0) + 1) / confirmedSteps.length * 100}%` }}
            />
          </div>
        </div>

        {/* Content Area - Narrative First Design */}
        <NarrativeContentArea
          isCapstone={isCapstone}
          currentStep={currentStep}
          discipline={discipline}
          syllabusUrls={syllabusUrls}
          rawSources={rawSources}
          urls={urls}
        />
      </div>
    </div>
  );
}