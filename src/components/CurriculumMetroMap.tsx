import { CheckCircle2, Circle, Award, Lock, ChevronDown, ChevronUp, Sparkles, Plus, Eye, BookOpen, Play, PenTool, Compass, ClipboardCheck, ChevronRight, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewMode, MissionControlStep, PedagogicalFunction } from "@/hooks/useMissionControl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { useMemo, useState, useEffect } from "react";

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
  onGenerateModuleNotes?: (pillar: string, stepTitles: string[]) => void;
  generatingModule?: string | null;
}

// Pedagogical function badge configuration
const PEDAGOGICAL_BADGES: Record<PedagogicalFunction, { label: string; className: string; icon: typeof Eye }> = {
  pre_exposure: { label: 'Preview', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Eye },
  concept_exposition: { label: 'Concept', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: BookOpen },
  expert_demonstration: { label: 'Demo', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Play },
  guided_practice: { label: 'Practice', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: PenTool },
  independent_practice: { label: 'Apply', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: Compass },
  assessment_checkpoint: { label: 'Check', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: ClipboardCheck },
};

function getPedagogicalBadge(fn?: PedagogicalFunction) {
  if (!fn || !PEDAGOGICAL_BADGES[fn]) return null;
  return PEDAGOGICAL_BADGES[fn];
}

// Group steps by pillar/module
interface StepGroup {
  pillar: string;
  steps: Array<{ step: MissionControlStep; index: number }>;
  totalHours: number;
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
  onGenerateModuleNotes,
  generatingModule,
}: CurriculumMetroMapProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group steps by pillar for hierarchical display
  const groupedSteps = useMemo((): StepGroup[] => {
    const groups = new Map<string, Array<{ step: MissionControlStep; index: number }>>();
    
    steps.forEach((step, index) => {
      const pillar = step.pillar || step.tag;
      if (!groups.has(pillar)) {
        groups.set(pillar, []);
      }
      groups.get(pillar)!.push({ step, index });
    });

    return Array.from(groups.entries()).map(([pillar, stepsInGroup]) => ({
      pillar,
      steps: stepsInGroup,
      totalHours: stepsInGroup.reduce((acc, { step }) => acc + (step.estimatedHours || 1), 0),
    }));
  }, [steps]);

  // Group confirmed steps for active mode
  const groupedConfirmedSteps = useMemo((): StepGroup[] => {
    const groups = new Map<string, Array<{ step: MissionControlStep; index: number }>>();
    
    confirmedSteps.forEach((step, index) => {
      const pillar = step.pillar || step.tag;
      if (!groups.has(pillar)) {
        groups.set(pillar, []);
      }
      groups.get(pillar)!.push({ step, index });
    });

    return Array.from(groups.entries()).map(([pillar, stepsInGroup]) => ({
      pillar,
      steps: stepsInGroup,
      totalHours: stepsInGroup.reduce((acc, { step }) => acc + (step.estimatedHours || 1), 0),
    }));
  }, [confirmedSteps]);

  const isCapstoneStep = (step: MissionControlStep) => 
    step.isCapstone || step.tag === 'Capstone Integration';

  // Get deselected steps for the "re-enable" section in active mode
  const deselectedSteps = mode === 'active' 
    ? steps.filter((_, idx) => !selectedSteps.has(idx))
    : [];

  const toggleGroup = (pillar: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(pillar)) {
        next.delete(pillar);
      } else {
        next.add(pillar);
      }
      return next;
    });
  };

  // Initialize all groups as expanded - use useEffect, not useMemo
  useEffect(() => {
    const allPillars = new Set(steps.map(s => s.pillar || s.tag));
    setExpandedGroups(allPillars);
  }, [steps]);

  const renderDraftStep = (step: MissionControlStep, index: number) => {
    const isSelected = selectedSteps.has(index);
    const isCapstone = isCapstoneStep(step);
    const isFromCustomPillar = !!step.fromCustomPillar;
    const pedagogicalBadge = getPedagogicalBadge(step.pedagogicalFunction);

    return (
      <div key={index} className="relative ml-4">
        {/* Station Node */}
        <div className="absolute -left-6 top-3 z-10">
          <div className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center shadow transition-all",
            isSelected
              ? isCapstone
                ? "bg-[hsl(var(--gold))]"
                : isFromCustomPillar
                  ? "bg-accent border-2 border-dashed border-accent-foreground/50"
                  : "bg-primary"
              : "bg-muted border-2 border-border"
          )}>
            {isCapstone && isSelected && (
              <Award className="h-2 w-2 text-white" />
            )}
          </div>
        </div>

        {/* Step Card */}
        <div className={cn(
          "p-2.5 rounded-lg transition-all border",
          isSelected
            ? isCapstone
              ? "bg-[hsl(var(--gold))]/5 border-[hsl(var(--gold))]/30"
              : isFromCustomPillar
                ? "bg-accent/10 border-dashed border-accent/50"
                : step.isAIDiscovered
                  ? "bg-violet-50/50 border-violet-300/50 dark:bg-violet-950/20 dark:border-violet-400/30"
                  : "bg-primary/5 border-primary/30"
            : "bg-muted/30 border-border opacity-60"
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Pedagogical Function Badge */}
              {pedagogicalBadge && isSelected && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 mb-1",
                  pedagogicalBadge.className
                )}>
                  <pedagogicalBadge.icon className="h-2.5 w-2.5" />
                  {pedagogicalBadge.label}
                </span>
              )}
              
              {/* Custom Focus / AI Badge */}
              {isFromCustomPillar && isSelected && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] mb-1 ml-1 border-dashed border-accent text-accent-foreground gap-0.5 py-0"
                >
                  <Plus className="h-2.5 w-2.5" />
                  {step.fromCustomPillar}
                </Badge>
              )}
              {step.isAIDiscovered && isSelected && !isFromCustomPillar && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] mb-1 ml-1 border-violet-300 text-violet-600 dark:border-violet-400 dark:text-violet-400 gap-0.5 py-0"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </Badge>
              )}

              <h4 className={cn(
                "font-medium text-xs leading-tight",
                !isSelected && "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              
              {step.learningObjective && isSelected && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {step.learningObjective}
                </p>
              )}
            </div>
            <Switch
              checked={isSelected}
              onCheckedChange={() => onToggleStep(index)}
              className="scale-75"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderActiveStep = (step: MissionControlStep, index: number) => {
    const isActive = activeStepIndex === index;
    const isCapstone = isCapstoneStep(step);
    const isPast = index < (activeStepIndex ?? 0);
    const isFuture = index > (activeStepIndex ?? 0);
    const pedagogicalBadge = getPedagogicalBadge(step.pedagogicalFunction);

    return (
      <div key={index} className="relative ml-4">
        {/* Station Node */}
        <div className="absolute -left-6 top-3 z-10">
          <div className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center shadow transition-all",
            isActive
              ? "bg-primary ring-2 ring-primary/20"
              : isPast
                ? "bg-green-500"
                : isCapstone
                  ? "bg-[hsl(var(--gold))]/50"
                  : "bg-muted border-2 border-border"
          )}>
            {isPast && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
            {isCapstone && !isPast && <Award className="h-2 w-2 text-[hsl(var(--gold))]" />}
            {isFuture && !isCapstone && <Lock className="h-2 w-2 text-muted-foreground" />}
          </div>
        </div>

        {/* Station Card - Clickable */}
        <button
          onClick={() => onNavigateToStep(index)}
          className={cn(
            "p-2.5 rounded-lg border transition-all w-full text-left",
            isActive
              ? "bg-primary/10 border-primary shadow-md"
              : isPast
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-muted/30 border-border hover:bg-muted/50"
          )}
        >
          {/* Pedagogical Badge */}
          {pedagogicalBadge && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 mb-1",
              pedagogicalBadge.className
            )}>
              <pedagogicalBadge.icon className="h-2.5 w-2.5" />
              {pedagogicalBadge.label}
            </span>
          )}
          
          <h4 className={cn(
            "font-medium text-xs",
            isPast && "text-muted-foreground"
          )}>
            {step.title}
          </h4>
        </button>
      </div>
    );
  };

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

      {/* Metro Line Container - Grouped by Pillar */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {mode === 'draft' ? (
            // Draft Mode: Group steps by pillar
            groupedSteps.map((group) => {
              const isExpanded = expandedGroups.has(group.pillar);
              const selectedInGroup = group.steps.filter(({ index }) => selectedSteps.has(index)).length;

              return (
                <Collapsible 
                  key={group.pillar} 
                  open={isExpanded} 
                  onOpenChange={() => toggleGroup(group.pillar)}
                >
                  {/* Module Header */}
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                      selectedInGroup === group.steps.length ? "border-primary/30" : "border-border"
                    )}>
                      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm flex-1 text-left truncate">
                        {group.pillar}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedInGroup}/{group.steps.length}
                      </Badge>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                  </CollapsibleTrigger>

                  {/* Nested Steps */}
                  <CollapsibleContent>
                    <div className="relative pl-4 mt-2 space-y-2">
                      {/* Vertical line connecting steps */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                      
                      {group.steps.map(({ step, index }) => renderDraftStep(step, index))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            // Active Mode: Group confirmed steps by pillar
            groupedConfirmedSteps.map((group) => {
              const isExpanded = expandedGroups.has(group.pillar);
              const hasActiveStep = group.steps.some(({ index }) => index === activeStepIndex);
              const isGenerating = generatingModule === group.pillar;
              const stepTitles = group.steps.map(({ step }) => step.title);

              return (
                <Collapsible 
                  key={group.pillar} 
                  open={isExpanded || hasActiveStep} 
                  onOpenChange={() => toggleGroup(group.pillar)}
                >
                  {/* Module Header */}
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                    hasActiveStep 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card hover:bg-muted/50"
                  )}>
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm flex-1 text-left truncate">
                        {group.pillar}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {group.steps.length} steps
                      </Badge>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        (isExpanded || hasActiveStep) && "rotate-90"
                      )} />
                    </CollapsibleTrigger>
                    
                    {/* Generate All Notes Button */}
                    {onGenerateModuleNotes && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateModuleNotes(group.pillar, stepTitles);
                            }}
                            disabled={isGenerating}
                          >
                            <Sparkles className={cn(
                              "h-3.5 w-3.5",
                              isGenerating && "animate-pulse text-primary"
                            )} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isGenerating ? 'Generating notes...' : 'Generate all notes for this module'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Nested Steps */}
                  <CollapsibleContent>
                    <div className="relative pl-4 mt-2 space-y-2">
                      {/* Vertical line connecting steps */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                      
                      {group.steps.map(({ step, index }) => renderActiveStep(step, index))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}

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