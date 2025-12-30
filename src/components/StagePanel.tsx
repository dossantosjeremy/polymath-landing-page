import { MapPin, Sparkles, BookOpen, Award, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MissionControlStep, ViewMode } from "@/hooks/useMissionControl";
import { StepSummary } from "@/components/StepSummary";
import { CuratedLearningPlayer } from "@/components/CuratedLearningPlayer";
import { CapstoneAssignment } from "@/components/CapstoneAssignment";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
              {/* AI Discovered Badge */}
              {currentStep.isAIDiscovered && (
                <Badge 
                  variant="outline" 
                  className="text-xs mb-2 border-violet-300 text-violet-600 dark:border-violet-400 dark:text-violet-400 gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  {t('learning.aiDiscovered')}
                </Badge>
              )}
              <h1 className="text-base sm:text-xl font-bold mb-1 break-words">{currentStep.title}</h1>
              <span className={cn(
                "text-xs px-2 py-1 rounded inline-block",
                isCapstone
                  ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]"
                  : currentStep.isAIDiscovered
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                    : "bg-primary/10 text-primary"
              )}>
                {currentStep.tag}
              </span>
            </div>
          </div>

          {currentStep.description && (
            <p className="text-muted-foreground mb-4 break-words">{currentStep.description}</p>
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

        {/* Content Area */}
        <div className="w-full min-w-0 overflow-hidden">
          {isCapstone ? (
            <CapstoneAssignment
              stepTitle={currentStep.title}
              discipline={discipline}
              syllabusUrls={syllabusUrls}
            />
          ) : (
            <>
              <CuratedLearningPlayer 
                key={currentStep.title}
                stepTitle={currentStep.title}
                discipline={discipline}
                syllabusUrls={syllabusUrls}
                isCapstone={false}
                autoLoad={true}
              />
              <StepSummary
                stepTitle={currentStep.title}
                discipline={discipline}
                stepDescription={currentStep.description || ""}
                sourceContent={(() => {
                  const relevantSources = rawSources.filter(s => urls.includes(s.url));
                  return relevantSources
                    .map(s => s.content && s.content !== '[[EXTRACTION_FAILED]]' ? s.content : '')
                    .filter(Boolean)
                    .join('\n\n---\n\n');
                })()}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
