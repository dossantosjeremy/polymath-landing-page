import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Clock, Target, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeRecommendedDepth,
  validateFeasibility,
  DEPTH_DESCRIPTIONS,
  DEPTH_COVERAGE,
} from "@/lib/learningPathConstraints";

// Interface matching the legacy PreGenerationConstraints
export interface SmartPreGenerationConstraints {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  hoursPerWeek: number;
  durationWeeks: number;
  // Auto-computed
  depth: 'overview' | 'standard' | 'detailed';
}

interface SmartPreGenerationSettingsProps {
  constraints: SmartPreGenerationConstraints;
  onChange: (constraints: SmartPreGenerationConstraints) => void;
  compact?: boolean;
}

export const SmartPreGenerationSettings = ({ 
  constraints, 
  onChange,
  compact = false 
}: SmartPreGenerationSettingsProps) => {
  const [durationUnit, setDurationUnit] = useState<'weeks' | 'months'>('weeks');

  const durationValue = useMemo(() => {
    return durationUnit === 'months' 
      ? Math.ceil(constraints.durationWeeks / 4) 
      : constraints.durationWeeks;
  }, [constraints.durationWeeks, durationUnit]);

  const totalAvailableHours = useMemo(() => {
    return constraints.hoursPerWeek * constraints.durationWeeks;
  }, [constraints.hoursPerWeek, constraints.durationWeeks]);

  const depthResult = useMemo(() => {
    return computeRecommendedDepth(totalAvailableHours, constraints.skillLevel);
  }, [totalAvailableHours, constraints.skillLevel]);

  const feasibility = useMemo(() => {
    return validateFeasibility(constraints.hoursPerWeek, constraints.durationWeeks, constraints.skillLevel);
  }, [constraints.hoursPerWeek, constraints.durationWeeks, constraints.skillLevel]);

  // Update parent when computed depth changes
  useMemo(() => {
    if (depthResult.depth && depthResult.depth !== constraints.depth) {
      onChange({ ...constraints, depth: depthResult.depth });
    }
  }, [depthResult.depth]);

  const handleSkillLevelChange = (value: 'beginner' | 'intermediate' | 'advanced') => {
    const newConstraints = { ...constraints, skillLevel: value };
    const newDepth = computeRecommendedDepth(
      newConstraints.hoursPerWeek * newConstraints.durationWeeks,
      value
    );
    onChange({ ...newConstraints, depth: newDepth.depth || 'overview' });
  };

  const handleHoursChange = (value: number) => {
    const newConstraints = { ...constraints, hoursPerWeek: value };
    const newDepth = computeRecommendedDepth(
      value * newConstraints.durationWeeks,
      newConstraints.skillLevel
    );
    onChange({ ...newConstraints, depth: newDepth.depth || 'overview' });
  };

  const handleDurationChange = (value: number) => {
    const weeks = durationUnit === 'months' ? value * 4 : value;
    const newConstraints = { ...constraints, durationWeeks: weeks };
    const newDepth = computeRecommendedDepth(
      newConstraints.hoursPerWeek * weeks,
      newConstraints.skillLevel
    );
    onChange({ ...newConstraints, depth: newDepth.depth || 'overview' });
  };

  const handleApplySuggestion = (action: () => Partial<{ hoursPerWeek: number; durationWeeks: number }>) => {
    const changes = action();
    const newConstraints = { ...constraints, ...changes };
    const newDepth = computeRecommendedDepth(
      newConstraints.hoursPerWeek * newConstraints.durationWeeks,
      newConstraints.skillLevel
    );
    onChange({ ...newConstraints, depth: newDepth.depth || 'overview' });
  };

  const getDepthBadgeColor = (depth: string | null) => {
    switch (depth) {
      case 'overview': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'standard': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'detailed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-destructive/10 text-destructive';
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Skill Level */}
          <div className="space-y-1.5">
            <Label className="text-xs">Skill Level</Label>
            <Select value={constraints.skillLevel} onValueChange={handleSkillLevelChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hours per Week */}
          <div className="space-y-1.5">
            <Label className="text-xs">Hours/Week</Label>
            <Input
              type="number"
              min={1}
              max={80}
              value={constraints.hoursPerWeek}
              onChange={(e) => handleHoursChange(Math.max(1, Math.min(80, parseInt(e.target.value) || 1)))}
              className="h-9"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                min={1}
                value={durationValue}
                onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 w-16"
              />
              <Select value={durationUnit} onValueChange={(v: any) => setDurationUnit(v)}>
                <SelectTrigger className="h-9 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weeks">wks</SelectItem>
                  <SelectItem value="months">mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact summary row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{totalAvailableHours}h total</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Badge className={cn(getDepthBadgeColor(depthResult.depth))}>
                    {depthResult.depth ? depthResult.depth.charAt(0).toUpperCase() + depthResult.depth.slice(1) : 'N/A'}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {depthResult.depth ? DEPTH_DESCRIPTIONS[depthResult.depth] : 'Not enough time'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Compact feasibility */}
        {feasibility.status !== 'valid' && (
          <div className={cn(
            "text-xs p-2 rounded flex items-center gap-2",
            feasibility.status === 'warning' && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
            feasibility.status === 'impossible' && "bg-destructive/10 text-destructive"
          )}>
            {feasibility.status === 'warning' && <AlertTriangle className="h-3 w-3" />}
            {feasibility.status === 'impossible' && <XCircle className="h-3 w-3" />}
            <span className="flex-1">{feasibility.message}</span>
          </div>
        )}
      </div>
    );
  }

  // Full layout
  return (
    <div className="space-y-6">
      {/* Step 1: Skill Level */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">1</span>
          <Label className="text-base font-medium">What's your current skill level?</Label>
        </div>
        <Select value={constraints.skillLevel} onValueChange={handleSkillLevelChange}>
          <SelectTrigger className="max-w-xs">
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

      {/* Step 2: Hours per Week */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">2</span>
          <Label className="text-base font-medium">How much time can you commit each week?</Label>
        </div>
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            type="number"
            min={1}
            max={80}
            value={constraints.hoursPerWeek}
            onChange={(e) => handleHoursChange(Math.max(1, Math.min(80, parseInt(e.target.value) || 1)))}
            className="w-24"
          />
          <span className="text-muted-foreground">hours</span>
        </div>
        {constraints.hoursPerWeek > 40 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm pl-8">
            <AlertTriangle className="h-4 w-4" />
            <span>That's quite intensive! Make sure you have the time.</span>
          </div>
        )}
        <p className="text-sm text-muted-foreground pl-8">
          Most learners dedicate 3-10 hours per week
        </p>
      </div>

      {/* Step 3: Duration */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">3</span>
          <Label className="text-base font-medium">How long do you want to learn?</Label>
        </div>
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            type="number"
            min={1}
            max={durationUnit === 'months' ? 24 : 52}
            value={durationValue}
            onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24"
          />
          <Select value={durationUnit} onValueChange={(v: any) => setDurationUnit(v)}>
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

      {/* Summary Card */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Auto-computed Depth:</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Badge className={cn(getDepthBadgeColor(depthResult.depth))}>
                    {depthResult.depth ? depthResult.depth.charAt(0).toUpperCase() + depthResult.depth.slice(1) : 'Insufficient'}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{depthResult.depth ? DEPTH_DESCRIPTIONS[depthResult.depth] : 'Not enough time for any coverage level'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Total time:</span>
          </div>
          <span className="font-medium">{totalAvailableHours} hours over {constraints.durationWeeks} weeks</span>
        </div>

        {depthResult.depth && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span>Coverage:</span>
            </div>
            <span>~{DEPTH_COVERAGE[depthResult.depth]}% of curriculum</span>
          </div>
        )}
      </div>

      {/* Feasibility */}
      {feasibility.status !== 'valid' && (
        <Alert className={cn(
          feasibility.status === 'warning' && 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20',
          feasibility.status === 'impossible' && 'border-destructive/50 bg-destructive/10'
        )}>
          <div className="flex items-start gap-3">
            {feasibility.status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />}
            {feasibility.status === 'impossible' && <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
            <div className="flex-1 space-y-2">
              <AlertDescription className="text-sm">{feasibility.message}</AlertDescription>
              {feasibility.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  );
};

// Legacy compatibility export
export interface PreGenerationConstraints {
  depth: 'overview' | 'standard' | 'detailed';
  hoursPerWeek: number;
  goalDate?: Date;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

// Convert legacy constraints to smart constraints
export function toLegacyConstraints(smart: SmartPreGenerationConstraints): PreGenerationConstraints {
  const weeks = smart.durationWeeks;
  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + weeks * 7);
  
  return {
    depth: smart.depth,
    hoursPerWeek: smart.hoursPerWeek,
    goalDate,
    skillLevel: smart.skillLevel,
  };
}

// Convert smart constraints from legacy
export function fromLegacyConstraints(legacy: PreGenerationConstraints): SmartPreGenerationConstraints {
  let durationWeeks = 4; // default
  if (legacy.goalDate) {
    const now = new Date();
    durationWeeks = Math.max(1, Math.ceil((legacy.goalDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }
  
  return {
    skillLevel: legacy.skillLevel,
    hoursPerWeek: legacy.hoursPerWeek,
    durationWeeks,
    depth: legacy.depth,
  };
}
