import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface PreGenerationConstraints {
  depth: 'overview' | 'standard' | 'detailed';
  hoursPerWeek: number;
  goalDate?: Date;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface PreGenerationSettingsProps {
  constraints: PreGenerationConstraints;
  onChange: (constraints: PreGenerationConstraints) => void;
  compact?: boolean;
}

export const PreGenerationSettings = ({ constraints, onChange, compact = false }: PreGenerationSettingsProps) => {
  const depthLabels = ['overview', 'standard', 'detailed'] as const;
  const depthNames = ['Overview', 'Standard', 'Detailed'];
  const depthIndex = depthLabels.indexOf(constraints.depth);

  const handleDepthChange = (index: number) => {
    onChange({ ...constraints, depth: depthLabels[index] });
  };

  const handleHoursChange = (hours: number) => {
    onChange({ ...constraints, hoursPerWeek: Math.max(1, Math.min(40, hours)) });
  };

  const handleGoalDateChange = (date: Date | undefined) => {
    onChange({ ...constraints, goalDate: date });
  };

  const handleSkillLevelChange = (level: 'beginner' | 'intermediate' | 'advanced') => {
    onChange({ ...constraints, skillLevel: level });
  };

  const weeksAvailable = constraints.goalDate 
    ? Math.ceil((constraints.goalDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Depth Slider */}
        <div className="space-y-2">
          <Label className="text-xs">Depth</Label>
          <Slider
            value={[depthIndex]}
            onValueChange={(value) => handleDepthChange(value[0])}
            min={0}
            max={2}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {depthNames.map((name, idx) => (
              <span 
                key={name} 
                className={cn(
                  "transition-colors",
                  depthIndex === idx && "text-primary font-medium"
                )}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Skill Level */}
        <div className="space-y-2">
          <Label htmlFor="skill-level-compact" className="text-xs">Skill Level</Label>
          <Select value={constraints.skillLevel} onValueChange={handleSkillLevelChange}>
            <SelectTrigger id="skill-level-compact" className="h-9">
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
        <div className="space-y-2">
          <Label htmlFor="hours-per-week-compact" className="text-xs">Hours/Week</Label>
          <Input
            id="hours-per-week-compact"
            type="number"
            min={1}
            max={40}
            value={constraints.hoursPerWeek}
            onChange={(e) => handleHoursChange(parseInt(e.target.value) || 5)}
            className="h-9"
          />
        </div>

        {/* Goal Date */}
        <div className="space-y-2">
          <Label className="text-xs">Goal Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left text-xs font-normal",
                  !constraints.goalDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {constraints.goalDate ? format(constraints.goalDate, "PP") : <span>Optional</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={constraints.goalDate}
                onSelect={handleGoalDateChange}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Depth Slider */}
      <div className="space-y-3">
        <Label>Curriculum Depth</Label>
        <div className="space-y-2">
          <Slider
            value={[depthIndex]}
            onValueChange={(value) => handleDepthChange(value[0])}
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
                  depthIndex === idx && "text-primary font-medium"
                )}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {depthIndex === 0 && "Minimal curriculum covering core concepts only"}
          {depthIndex === 1 && "Balanced curriculum with standard coverage"}
          {depthIndex === 2 && "Comprehensive curriculum with deep exploration"}
        </p>
      </div>

      {/* Skill Level */}
      <div className="space-y-3">
        <Label htmlFor="skill-level">Current Skill Level</Label>
        <Select value={constraints.skillLevel} onValueChange={handleSkillLevelChange}>
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
          value={constraints.hoursPerWeek}
          onChange={(e) => handleHoursChange(parseInt(e.target.value) || 5)}
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
                !constraints.goalDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {constraints.goalDate ? format(constraints.goalDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={constraints.goalDate}
              onSelect={handleGoalDateChange}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {weeksAvailable && (
          <p className="text-xs text-muted-foreground">
            {weeksAvailable} weeks × {constraints.hoursPerWeek}h/week = {weeksAvailable * constraints.hoursPerWeek}h total budget
          </p>
        )}
        {!constraints.goalDate && (
          <p className="text-xs text-muted-foreground">
            Without a goal date, only depth setting affects the curriculum
          </p>
        )}
      </div>
    </div>
  );
};
