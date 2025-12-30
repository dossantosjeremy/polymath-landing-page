import { CheckCircle2, Circle, Award, Lock, ChevronDown, ChevronUp, Sparkles, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewMode, MissionControlStep } from "@/hooks/useMissionControl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface CurriculumMetroMapProps {
  steps: MissionControlStep[];
  mode: ViewMode;
  selectedSteps: Set<number>;
  activeStepIndex: number | null;
  confirmedSteps: MissionControlStep[];
  isConfirming: boolean;
  stats: {
    total: number;
    selected: number;
    estimatedHours: number;
  };
  onToggleStep: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onConfirm: () => void;
  onNavigateToStep: (index: number) => void;
  onReEnableStep: (originalIndex: number) => void;
}

export function CurriculumMetroMap({
  steps,
  mode,
  selectedSteps,
  activeStepIndex,
  confirmedSteps,
  isConfirming,
  stats,
  onToggleStep,
  onSelectAll,
  onDeselectAll,
  onConfirm,
  onNavigateToStep,
  onReEnableStep,
}: CurriculumMetroMapProps) {
  const { t } = useTranslation();

  const isCapstoneStep = (step: MissionControlStep) => 
    step.isCapstone || step.tag === 'Capstone Integration';

  // Get deselected steps for the "re-enable" section in active mode
  const deselectedSteps = mode === 'active' 
    ? steps.filter((_, idx) => !selectedSteps.has(idx))
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg mb-1">{t('learning.curriculumMap')}</h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'draft' 
            ? t('learning.customizePath') 
            : t('learning.navigateJourney')}
        </p>
      </div>

      {/* Draft Mode Controls */}
      {mode === 'draft' && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {t('learning.stepsSelectedCount', { selected: stats.selected, total: stats.total })}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                {t('common.all')}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDeselectAll}>
                {t('common.none')}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('learning.hoursEstimated', { hours: stats.estimatedHours })}
          </p>
        </div>
      )}

      {/* Metro Line Container */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="relative pl-8">
            {/* Continuous vertical metro line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {mode === 'draft' ? (
                // Draft Mode: Show all steps with toggles
                steps.map((step, index) => {
                  const isSelected = selectedSteps.has(index);
                  const isCapstone = isCapstoneStep(step);
                  const isFromCustomPillar = !!step.fromCustomPillar;

                  return (
                    <div key={index} className="relative">
                      {/* Station Node */}
                      <div className="absolute -left-8 top-3 z-10">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shadow transition-all",
                          isSelected
                            ? isCapstone
                              ? "bg-[hsl(var(--gold))]"
                              : isFromCustomPillar
                                ? "bg-accent border-2 border-dashed border-accent-foreground/50"
                                : "bg-primary"
                            : "bg-muted border-2 border-border"
                        )}>
                          {isCapstone && (
                            <Award className={cn(
                              "h-3 w-3",
                              isSelected ? "text-white" : "text-muted-foreground"
                            )} />
                          )}
                          {isFromCustomPillar && !isCapstone && isSelected && (
                            <Plus className="h-3 w-3 text-accent-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Station Card */}
                      <div className={cn(
                        "ml-2 p-3 rounded-lg transition-all",
                        isSelected
                          ? isCapstone
                            ? "bg-[hsl(var(--gold))]/5 border border-[hsl(var(--gold))]/30"
                            : isFromCustomPillar
                              ? "bg-accent/10 border-2 border-dashed border-accent/50"
                              : step.isAIDiscovered
                                ? "bg-violet-50/50 border border-violet-300/50 dark:bg-violet-950/20 dark:border-violet-400/30"
                                : "bg-primary/5 border border-primary/30"
                          : "bg-muted/30 border border-border opacity-60"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Custom Focus Badge */}
                            {isFromCustomPillar && isSelected && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs mb-1.5 border-dashed border-accent text-accent-foreground gap-1 cursor-help"
                                  >
                                    <Plus className="h-3 w-3" />
                                    {t('learning.fromPillar', { pillar: step.fromCustomPillar })}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('learning.customFocusTooltip')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {/* AI Discovered Badge */}
                            {step.isAIDiscovered && isSelected && !isFromCustomPillar && (
                              <Badge 
                                variant="outline" 
                                className="text-xs mb-1.5 border-violet-300 text-violet-600 dark:border-violet-400 dark:text-violet-400 gap-1"
                              >
                                <Sparkles className="h-3 w-3" />
                                {t('learning.aiDiscovered')}
                              </Badge>
                            )}
                            <h4 className={cn(
                              "font-medium text-sm",
                              !isSelected && "text-muted-foreground"
                            )}>
                              {step.title}
                            </h4>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {step.description}
                              </p>
                            )}
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded mt-2 inline-block",
                              isCapstone
                                ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]"
                                : isFromCustomPillar
                                  ? "bg-accent/20 text-accent-foreground"
                                  : step.isAIDiscovered
                                    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                                    : "bg-primary/10 text-primary"
                            )}>
                              {step.tag}
                            </span>
                          </div>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={() => onToggleStep(index)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Active Mode: Show confirmed steps as navigation
                confirmedSteps.map((step, index) => {
                  const isActive = activeStepIndex === index;
                  const isCapstone = isCapstoneStep(step);
                  // Future steps have no completion status yet
                  const isPast = index < (activeStepIndex ?? 0);
                  const isFuture = index > (activeStepIndex ?? 0);

                  return (
                    <div key={index} className="relative">
                      {/* Station Node */}
                      <div className="absolute -left-8 top-3 z-10">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shadow transition-all",
                          isActive
                            ? "bg-primary ring-4 ring-primary/20 animate-pulse"
                            : isPast
                              ? "bg-green-500"
                              : isCapstone
                                ? "bg-[hsl(var(--gold))]/50"
                                : "bg-muted border-2 border-border"
                        )}>
                          {isPast ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : isCapstone ? (
                            <Award className={cn(
                              "h-3 w-3",
                              isActive ? "text-primary-foreground" : "text-[hsl(var(--gold))]"
                            )} />
                          ) : isFuture ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : null}
                        </div>
                      </div>

                      {/* Station Card - Clickable */}
                      <button
                        onClick={() => onNavigateToStep(index)}
                        className={cn(
                          "ml-2 p-3 rounded-lg border transition-all w-full text-left",
                          isActive
                            ? "bg-primary/10 border-primary shadow-lg"
                            : isPast
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                              : "bg-muted/30 border-border hover:bg-muted/50"
                        )}
                      >
                        <h4 className={cn(
                          "font-medium text-sm",
                          isPast && "text-muted-foreground"
                        )}>
                          {step.title}
                        </h4>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded mt-1 inline-block",
                          isCapstone
                            ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]"
                            : "bg-primary/10 text-primary"
                        )}>
                          {step.tag}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Re-enable deselected steps section in active mode */}
          {mode === 'active' && deselectedSteps.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                {t('learning.skippedSteps')}
              </p>
              <div className="space-y-2">
                {deselectedSteps.map((step) => (
                  <button
                    key={step.originalIndex}
                    onClick={() => onReEnableStep(step.originalIndex)}
                    className="w-full p-2 text-left text-xs bg-muted/30 border border-dashed rounded hover:bg-muted/50 transition-colors"
                  >
                    + {step.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Confirm Button - Draft Mode Only */}
      {mode === 'draft' && (
        <div className="p-4 border-t bg-background">
          <Button
            onClick={onConfirm}
            disabled={selectedSteps.size === 0 || isConfirming}
            className="w-full"
            size="lg"
          >
            {isConfirming ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t('learning.buildingPath')}
              </>
            ) : (
              <>
                {t('learning.confirmStartJourney')}
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {t('learning.stepsSummary', { steps: stats.selected, hours: stats.estimatedHours })}
          </p>
        </div>
      )}
    </div>
  );
}
