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
  totalSteps: number;
  visibleSteps: number;
  percentPruned: number;
  estimatedHours: number;
  budgetHours: number;
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
              <Label htmlFor="hours-per-week">Hours per Week</Label>
              <Input
                id="hours-per-week"
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Math.max(1, Math.min(40, parseInt(e.target.value) || 5)))}
              />
              <p className="text-xs text-muted-foreground">
                Available study time per week (1-40 hours)
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
                  {weeksAvailable} weeks available • {weeksAvailable * hoursPerWeek} total hours
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

      {/* Pruning Summary */}
      {pruningStats && pruningStats.percentPruned > 0 && (
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Based on your time limit ({pruningStats.budgetHours}h total), we pruned{" "}
            <strong>{pruningStats.percentPruned}%</strong> of the standard curriculum.
            Showing {pruningStats.visibleSteps} of {pruningStats.totalSteps} steps
            (estimated {pruningStats.estimatedHours}h).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
