import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Settings, Info, Clock, Calendar, Target, AlertTriangle, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SmartConstraints,
  computeRecommendedDepth,
  validateFeasibility,
  calculateCompletionDate,
  DEPTH_DESCRIPTIONS,
  DEPTH_COVERAGE,
  sliderIndexToDepth,
  depthToSliderIndex,
  computeRecommendedHoursFromDepth,
} from "@/lib/learningPathConstraints";
import { LearningDepthSlider, DEPTH_STEPS } from "@/components/ui/learning-depth-slider";

// Re-export types for backward compatibility
export type { SmartConstraints };

// Legacy interface for backward compatibility
export interface LearningPathConstraints {
  depth: 'overview' | 'standard' | 'detailed';
  hoursPerWeek: number;
  goalDate?: Date;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface PruningStats {
  fullCurriculumSteps: number;
  fullCurriculumHours: number;
  depthLabel: 'overview' | 'standard' | 'detailed';
  stepsAfterDepthFilter: number;
  hoursAfterDepthFilter: number;
  stepsHiddenByDepth: number;
  hasTimeConstraint: boolean;
  stepsHiddenByTime: number;
  budgetHours?: number;
  weeksAvailable?: number;
  finalVisibleSteps: number;
  finalEstimatedHours: number;
  hoursSaved: number;
  hiddenByDepthTitles: string[];
  hiddenByTimeTitles: string[];
}

// Generation stages for progress
const GENERATION_STAGES = [
  { label: 'Analyzing topic', estimatedSeconds: 5 },
  { label: 'Discovering sources', estimatedSeconds: 12 },
  { label: 'Fetching content', estimatedSeconds: 18 },
  { label: 'Synthesizing curriculum', estimatedSeconds: 30 },
  { label: 'Applying constraints', estimatedSeconds: 8 },
  { label: 'Finalizing', estimatedSeconds: 5 },
];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
};

interface SmartLearningPathSettingsProps {
  onGenerate: (constraints: LearningPathConstraints) => void;
  pruningStats?: PruningStats;
  isGenerating: boolean;
  defaultOpen?: boolean;
}

export const SmartLearningPathSettings = ({ 
  onGenerate, 
  pruningStats, 
  isGenerating,
  defaultOpen = false 
}: SmartLearningPathSettingsProps) => {
  const [open, setOpen] = useState(defaultOpen);
  
  // Configuration mode: 'time' or 'coverage'
  const [configMode, setConfigMode] = useState<'time' | 'coverage'>('time');
  
  // User inputs - Time mode
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [durationValue, setDurationValue] = useState<number>(4);
  const [durationUnit, setDurationUnit] = useState<'weeks' | 'months'>('weeks');
  
  // User inputs - Coverage mode
  const [coverageIndex, setCoverageIndex] = useState<0 | 1 | 2>(1); // Default to "Balanced"
  
  // Generation progress
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  
  const totalEstimatedTime = GENERATION_STAGES.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  // Reset elapsed time when generation starts/stops
  useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
      setCurrentStageIndex(0);
    }
  }, [isGenerating]);

  // Timer for elapsed time during generation
  useEffect(() => {
    if (!isGenerating) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Progress through stages based on elapsed time
  useEffect(() => {
    if (!isGenerating) return;
    
    let accumulatedTime = 0;
    for (let i = 0; i < GENERATION_STAGES.length; i++) {
      accumulatedTime += GENERATION_STAGES[i].estimatedSeconds;
      if (elapsedTime < accumulatedTime) {
        setCurrentStageIndex(i);
        break;
      }
    }
    if (elapsedTime >= totalEstimatedTime) {
      setCurrentStageIndex(GENERATION_STAGES.length - 1);
    }
  }, [elapsedTime, isGenerating, totalEstimatedTime]);

  // Computed values - Time mode
  const durationWeeks = useMemo(() => {
    return durationUnit === 'months' ? durationValue * 4 : durationValue;
  }, [durationValue, durationUnit]);

  const totalAvailableHours = useMemo(() => {
    return hoursPerWeek * durationWeeks;
  }, [hoursPerWeek, durationWeeks]);

  const depthResultFromTime = useMemo(() => {
    return computeRecommendedDepth(totalAvailableHours, skillLevel);
  }, [totalAvailableHours, skillLevel]);

  // Computed values - Coverage mode
  const selectedDepth = useMemo(() => {
    return sliderIndexToDepth(coverageIndex);
  }, [coverageIndex]);

  const estimatedHoursFromCoverage = useMemo(() => {
    return computeRecommendedHoursFromDepth(selectedDepth, skillLevel);
  }, [selectedDepth, skillLevel]);

  // Final values based on mode
  const finalDepth = useMemo(() => {
    if (configMode === 'coverage') {
      return selectedDepth;
    }
    return depthResultFromTime.depth;
  }, [configMode, selectedDepth, depthResultFromTime.depth]);

  const finalTotalHours = useMemo(() => {
    if (configMode === 'coverage') {
      return estimatedHoursFromCoverage.typicalHours;
    }
    return totalAvailableHours;
  }, [configMode, estimatedHoursFromCoverage.typicalHours, totalAvailableHours]);

  const finalDurationWeeks = useMemo(() => {
    if (configMode === 'coverage') {
      return estimatedHoursFromCoverage.recommendedWeeksAt5HoursPerWeek;
    }
    return durationWeeks;
  }, [configMode, estimatedHoursFromCoverage.recommendedWeeksAt5HoursPerWeek, durationWeeks]);

  const feasibility = useMemo(() => {
    if (configMode === 'coverage') {
      // Coverage mode is always valid since we derive time from depth
      return {
        status: 'valid' as const,
        message: 'Your plan is achievable! Time estimates are based on your chosen coverage level.',
        suggestions: [],
      };
    }
    return validateFeasibility(hoursPerWeek, durationWeeks, skillLevel);
  }, [configMode, hoursPerWeek, durationWeeks, skillLevel]);

  const estimatedCompletionDate = useMemo(() => {
    return calculateCompletionDate(finalDurationWeeks);
  }, [finalDurationWeeks]);

  const isValid = feasibility.status !== 'impossible' && finalDepth !== null;
  const isCustomSettings = hoursPerWeek !== 5 || durationWeeks !== 4 || skillLevel !== 'beginner' || configMode === 'coverage';

  const handleGenerate = () => {
    if (!isValid || !finalDepth) return;
    
    onGenerate({
      depth: finalDepth,
      hoursPerWeek: configMode === 'coverage' ? 5 : hoursPerWeek, // Default 5 hrs/week for coverage mode
      goalDate: estimatedCompletionDate,
      skillLevel,
    });
  };

  // Sync coverage index when time mode depth changes
  const handleModeChange = (mode: string) => {
    const newMode = mode as 'time' | 'coverage';
    if (newMode === 'coverage' && depthResultFromTime.depth) {
      // Sync slider to match current computed depth from time
      setCoverageIndex(depthToSliderIndex(depthResultFromTime.depth));
    }
    setConfigMode(newMode);
  };

  const handleApplySuggestion = (action: () => Partial<{ hoursPerWeek: number; durationWeeks: number; skillLevel: 'beginner' | 'intermediate' | 'advanced' }>) => {
    const changes = action();
    if (changes.hoursPerWeek !== undefined) setHoursPerWeek(changes.hoursPerWeek);
    if (changes.durationWeeks !== undefined) {
      if (durationUnit === 'months') {
        setDurationValue(Math.ceil(changes.durationWeeks / 4));
      } else {
        setDurationValue(changes.durationWeeks);
      }
    }
    if (changes.skillLevel !== undefined) setSkillLevel(changes.skillLevel);
  };

  const getDepthBadgeColor = (depth: string | null) => {
    switch (depth) {
      case 'overview': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'standard': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'detailed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-destructive/10 text-destructive';
    }
  };

  return (
    <div className="w-full mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Create Your Learning Path</span>
              {isCustomSettings && <Badge variant="secondary">Custom</Badge>}
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 border rounded-lg p-6 space-y-6 bg-card">
          {/* Step 1: Skill Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">1</span>
              <Label htmlFor="skill-level" className="text-base font-medium">What's your current skill level?</Label>
            </div>
            <Select value={skillLevel} onValueChange={(value: any) => setSkillLevel(value)}>
              <SelectTrigger id="skill-level" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground pl-8">
              This helps us estimate how long each topic will take
            </p>
          </div>

          {/* Step 2: Configuration Mode Toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">2</span>
              <Label className="text-base font-medium">How do you want to plan?</Label>
            </div>
            
            <Tabs value={configMode} onValueChange={handleModeChange} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="time" className="text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  By Time & Schedule
                </TabsTrigger>
                <TabsTrigger value="coverage" className="text-sm">
                  <Target className="h-4 w-4 mr-2" />
                  By Coverage Depth
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Time Mode Inputs */}
          {configMode === 'time' && (
            <>
              {/* Hours per Week */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">3</span>
                  <Label htmlFor="hours-per-week" className="text-base font-medium">How much time can you commit each week?</Label>
                </div>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    id="hours-per-week"
                    type="number"
                    min={1}
                    max={80}
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Math.max(1, Math.min(80, parseInt(e.target.value) || 1)))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">hours</span>
                </div>
                {hoursPerWeek > 40 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm pl-8">
                    <AlertTriangle className="h-4 w-4" />
                    <span>That's quite intensive! Make sure you have the time.</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground pl-8">
                  Most learners dedicate 3-10 hours per week
                </p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">4</span>
                  <Label className="text-base font-medium">How long do you want to learn?</Label>
                </div>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    type="number"
                    min={1}
                    max={durationUnit === 'months' ? 24 : 52}
                    value={durationValue}
                    onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                  />
                  <Select value={durationUnit} onValueChange={(value: any) => setDurationUnit(value)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  Longer durations unlock deeper coverage
                </p>
              </div>
            </>
          )}

          {/* Coverage Mode Input */}
          {configMode === 'coverage' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">3</span>
                <Label className="text-base font-medium">How complete do you want your learning to be?</Label>
              </div>
              <LearningDepthSlider
                value={coverageIndex}
                onChange={(index) => setCoverageIndex(index as 0 | 1 | 2)}
                estimatedHours={estimatedHoursFromCoverage.typicalHours}
                estimatedWeeks={estimatedHoursFromCoverage.recommendedWeeksAt5HoursPerWeek}
              />
              <p className="text-sm text-muted-foreground mt-4">
                Time estimates assume ~5 hours per week. Adjust based on your availability.
              </p>
            </div>
          )}

          {/* Your Learning Plan Summary */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Your Learning Plan</h3>
            </div>

            {/* Recommended Depth */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{configMode === 'coverage' ? 'Selected Depth:' : 'Recommended Depth:'}</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Badge 
                        className={cn(
                          "text-sm font-medium",
                          getDepthBadgeColor(finalDepth)
                        )}
                      >
                        {finalDepth ? finalDepth.charAt(0).toUpperCase() + finalDepth.slice(1) : 'Insufficient Time'}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      {finalDepth 
                        ? DEPTH_DESCRIPTIONS[finalDepth]
                        : 'Your available time is not enough for even an overview. Please increase hours or duration.'}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {configMode === 'coverage' 
                        ? 'You selected this depth level. Time estimates are derived from it.'
                        : 'Depth is automatically determined based on your available time.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Total Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total:</span>
              </div>
              <span className="font-medium">
                {configMode === 'coverage' 
                  ? `~${finalTotalHours} hours over ~${finalDurationWeeks} weeks`
                  : `${finalTotalHours} hours over ${finalDurationWeeks} weeks`}
              </span>
            </div>

            {/* Estimated Completion */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Estimated completion:</span>
              </div>
              <span className="font-medium">{format(estimatedCompletionDate, 'MMMM d, yyyy')}</span>
            </div>

            {/* Coverage */}
            {finalDepth && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Covers:</span>
                </div>
                <span className="font-medium">~{DEPTH_COVERAGE[finalDepth]}% of comprehensive curriculum</span>
              </div>
            )}
          </div>

          {/* Feasibility Check */}
          <Alert className={cn(
            feasibility.status === 'valid' && 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20',
            feasibility.status === 'warning' && 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20',
            feasibility.status === 'impossible' && 'border-destructive/50 bg-destructive/10'
          )}>
            <div className="flex items-start gap-3">
              {feasibility.status === 'valid' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />}
              {feasibility.status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />}
              {feasibility.status === 'impossible' && <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
              <div className="flex-1 space-y-2">
                <AlertDescription className="text-sm font-medium">
                  {feasibility.status === 'valid' && '✓ Your plan is achievable!'}
                  {feasibility.status === 'warning' && '⚠️ Advisory'}
                  {feasibility.status === 'impossible' && '✗ Plan not feasible'}
                </AlertDescription>
                <p className="text-sm text-muted-foreground">{feasibility.message}</p>
                
                {feasibility.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {feasibility.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion.action)}
                        className="text-xs"
                      >
                        {suggestion.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Alert>

          {/* Generate Button with Progress */}
          {isGenerating ? (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium">{GENERATION_STAGES[currentStageIndex]?.label || 'Processing'}...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Step {currentStageIndex + 1} of {GENERATION_STAGES.length}
                </span>
              </div>
              
              <Progress 
                value={Math.min(95, (elapsedTime / totalEstimatedTime) * 100)} 
                className="h-2" 
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Elapsed: {formatTime(elapsedTime)}</span>
                {elapsedTime < totalEstimatedTime ? (
                  <span>Est. remaining: ~{formatTime(Math.max(0, totalEstimatedTime - elapsedTime))}</span>
                ) : (
                  <span className="animate-pulse">Still working... complex topics take longer</span>
                )}
              </div>
            </div>
          ) : (
            <Button 
              onClick={handleGenerate} 
              disabled={!isValid}
              className="w-full"
              size="lg"
            >
              Generate My Learning Path
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Pruning Stats (after generation) */}
      {pruningStats && (
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <div className="font-medium text-base">
              {pruningStats.depthLabel.charAt(0).toUpperCase() + pruningStats.depthLabel.slice(1)} Mode
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-24">Coverage:</span>
                <div>
                  <strong>{pruningStats.finalVisibleSteps}</strong> of {pruningStats.fullCurriculumSteps} total steps
                  {pruningStats.stepsHiddenByDepth > 0 && (
                    <span className="text-muted-foreground"> ({pruningStats.stepsHiddenByDepth} filtered by depth)</span>
                  )}
                  {pruningStats.stepsHiddenByTime > 0 && (
                    <span className="text-muted-foreground"> ({pruningStats.stepsHiddenByTime} filtered by time)</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-24">Time estimate:</span>
                <div>
                  <strong>{pruningStats.finalEstimatedHours}h</strong>
                  {pruningStats.hoursSaved > 0 && (
                    <span className="text-green-600 dark:text-green-400"> (saving {pruningStats.hoursSaved}h vs full curriculum)</span>
                  )}
                </div>
              </div>
              
              {pruningStats.hasTimeConstraint && pruningStats.budgetHours && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-24">Time budget:</span>
                  <span>{pruningStats.budgetHours}h total ({pruningStats.weeksAvailable} weeks)</span>
                </div>
              )}
            </div>
            
            {/* Collapsible hidden topics */}
            {(pruningStats.hiddenByDepthTitles.length > 0 || pruningStats.hiddenByTimeTitles.length > 0) && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:underline hover:bg-transparent">
                    View hidden topics ({pruningStats.hiddenByDepthTitles.length + pruningStats.hiddenByTimeTitles.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2 text-sm">
                  {pruningStats.hiddenByDepthTitles.length > 0 && (
                    <div className="border-l-2 border-muted pl-3">
                      <div className="font-medium mb-1">Hidden by depth setting:</div>
                      <div className="text-muted-foreground space-y-1">
                        {pruningStats.hiddenByDepthTitles.map((title, idx) => (
                          <div key={idx}>• {title}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pruningStats.hiddenByTimeTitles.length > 0 && (
                    <div className="border-l-2 border-muted pl-3">
                      <div className="font-medium mb-1">Hidden by time constraint:</div>
                      <div className="text-muted-foreground space-y-1">
                        {pruningStats.hiddenByTimeTitles.map((title, idx) => (
                          <div key={idx}>• {title}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Export legacy component for backward compatibility
export const LearningPathSettings = SmartLearningPathSettings;
