import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Settings, Info, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface LearningPathConstraints {
  depth: 'overview' | 'standard' | 'detailed';
  hoursPerWeek: number;
  goalDate?: Date;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface PruningStats {
  // Full curriculum baseline
  fullCurriculumSteps: number;
  fullCurriculumHours: number;
  
  // Depth filtering results
  depthLabel: 'overview' | 'standard' | 'detailed';
  stepsAfterDepthFilter: number;
  hoursAfterDepthFilter: number;
  stepsHiddenByDepth: number;
  
  // Time constraint results (if applicable)
  hasTimeConstraint: boolean;
  stepsHiddenByTime: number;
  budgetHours?: number;
  weeksAvailable?: number;
  
  // Final results
  finalVisibleSteps: number;
  finalEstimatedHours: number;
  hoursSaved: number;
  
  // Hidden topic titles for transparency
  hiddenByDepthTitles: string[];
  hiddenByTimeTitles: string[];
}

interface LearningPathSettingsProps {
  onApply: (constraints: LearningPathConstraints) => void;
  pruningStats?: PruningStats;
  isApplying: boolean;
}

export const LearningPathSettings = ({ onApply, pruningStats, isApplying }: LearningPathSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [depth, setDepth] = useState<number>(1); // 0=overview, 1=standard, 2=detailed
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [goalDate, setGoalDate] = useState<Date | undefined>();
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const depthLabels = ['overview', 'standard', 'detailed'] as const;
  const depthNames = ['Overview', 'Standard', 'Detailed'];

  const handleApply = () => {
    onApply({
      depth: depthLabels[depth],
      hoursPerWeek,
      goalDate,
      skillLevel
    });
  };

  const isCustomSettings = depth !== 1 || hoursPerWeek !== 5 || goalDate || skillLevel !== 'beginner';

  const weeksAvailable = goalDate 
    ? Math.ceil((goalDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

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
              <span>Learning Path Settings</span>
              {isCustomSettings && <Badge variant="secondary">Custom</Badge>}
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Depth Slider */}
            <div className="space-y-3">
              <Label>Curriculum Depth</Label>
              <div className="space-y-2">
                <Slider
                  value={[depth]}
                  onValueChange={(value) => setDepth(value[0])}
                  min={0}
                  max={2}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {depthNames.map((name, idx) => (
                    <span 
                      key={name} 
                      className={cn(
                        "transition-colors",
                        depth === idx && "text-primary font-medium"
                      )}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {depth === 0 && "Minimal curriculum covering core concepts only"}
                {depth === 1 && "Balanced curriculum with standard coverage"}
                {depth === 2 && "Comprehensive curriculum with deep exploration"}
              </p>
            </div>

            {/* Skill Level */}
            <div className="space-y-3">
              <Label htmlFor="skill-level">Current Skill Level</Label>
              <Select value={skillLevel} onValueChange={(value: any) => setSkillLevel(value)}>
                <SelectTrigger id="skill-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Affects time estimates per topic
              </p>
            </div>

            {/* Hours per Week */}
            <div className="space-y-3">
              <Label htmlFor="hours-per-week">Hours per Week (Optional)</Label>
              <Input
                id="hours-per-week"
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Math.max(1, Math.min(40, parseInt(e.target.value) || 5)))}
              />
              <p className="text-xs text-muted-foreground">
                Used with goal date for time-based filtering
              </p>
            </div>

            {/* Goal Date */}
            <div className="space-y-3">
              <Label>Goal Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !goalDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {goalDate ? format(goalDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={goalDate}
                    onSelect={setGoalDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {weeksAvailable && (
                <p className="text-xs text-muted-foreground">
                  {weeksAvailable} weeks × {hoursPerWeek}h/week = {weeksAvailable * hoursPerWeek}h total budget
                </p>
              )}
              {!goalDate && (
                <p className="text-xs text-muted-foreground">
                  Without a goal date, only depth setting affects the curriculum
                </p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleApply} 
            disabled={isApplying}
            className="w-full"
          >
            {isApplying ? "Applying Constraints..." : "Apply Constraints & Regenerate"}
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Enhanced Pruning Summary */}
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
                  <span>{pruningStats.budgetHours}h total ({pruningStats.weeksAvailable} weeks × {hoursPerWeek}h/week)</span>
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
