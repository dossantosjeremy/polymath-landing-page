import { useState, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, Sparkles, X, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface CustomFocusPillsProps {
  pillars: TopicPillar[];
  selectedPillars: Set<string>;
  customPillars: string[];
  onTogglePillar: (pillarName: string) => void;
  onAddCustomPillar: (pillarName: string) => void;
  onRemoveCustomPillar: (pillarName: string) => void;
  onApplyFocus: () => void;
  onResetToDefaults: () => void;
  isApplying?: boolean;
  alwaysShowAddButton?: boolean; // Always show the add button even when no pillars exist
}

const FOCUS_STAGES = [
  { id: 'analyzing', label: 'Analyzing selected topics', seconds: 3 },
  { id: 'searching', label: 'Searching for resources', seconds: 8 },
  { id: 'filtering', label: 'Filtering by focus areas', seconds: 5 },
  { id: 'organizing', label: 'Organizing curriculum', seconds: 4 },
  { id: 'finalizing', label: 'Finalizing syllabus', seconds: 3 },
];

const priorityStyles: Record<string, string> = {
  core: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
  important: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
  "nice-to-have": "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  custom: "bg-accent/10 text-accent-foreground border-accent/30 hover:bg-accent/20",
};

const selectedStyles: Record<string, string> = {
  core: "bg-primary text-primary-foreground border-primary",
  important: "bg-violet-500 text-white border-violet-500",
  "nice-to-have": "bg-foreground text-background border-foreground",
  custom: "bg-accent text-accent-foreground border-accent",
};

export function CustomFocusPills({
  pillars,
  selectedPillars,
  customPillars,
  onTogglePillar,
  onAddCustomPillar,
  onRemoveCustomPillar,
  onApplyFocus,
  onResetToDefaults,
  isApplying = false,
  alwaysShowAddButton = false,
}: CustomFocusPillsProps) {
  const [inputValue, setInputValue] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  
  // Progress tracking when applying - with timeout detection
  useEffect(() => {
    if (!isApplying) {
      setElapsed(0);
      setCurrentStageIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsed(prev => {
        // After 90 seconds, consider it potentially stuck
        if (prev >= 90) {
          return prev; // Stop incrementing but keep showing progress
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isApplying]);
  
  useEffect(() => {
    let cumulativeTime = 0;
    for (let i = 0; i < FOCUS_STAGES.length; i++) {
      cumulativeTime += FOCUS_STAGES[i].seconds;
      if (elapsed < cumulativeTime) {
        setCurrentStageIndex(i);
        return;
      }
    }
    setCurrentStageIndex(FOCUS_STAGES.length - 1);
  }, [elapsed]);
  
  const totalEstimatedSeconds = FOCUS_STAGES.reduce((sum, s) => sum + s.seconds, 0);
  const overallProgress = Math.min((elapsed / totalEstimatedSeconds) * 100, 95);
  const estimatedRemaining = Math.max(totalEstimatedSeconds - elapsed, 0);
  
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };
  
  // Check if there are changes from defaults
  const defaultSelected = new Set(
    pillars
      .filter(p => p.priority === 'core' || p.priority === 'important')
      .map(p => p.name)
  );
  
  // Count actual changes: custom pillars + any new selections not in defaults
  const addedTopics = customPillars.length + 
    [...selectedPillars].filter(p => !defaultSelected.has(p) && !customPillars.includes(p)).length;
  const removedTopics = [...defaultSelected].filter(p => !selectedPillars.has(p)).length;
  const totalChanges = addedTopics + removedTopics;
  
  const hasChanges = 
    customPillars.length > 0 ||
    selectedPillars.size !== defaultSelected.size ||
    ![...selectedPillars].every(p => defaultSelected.has(p));

  // Only hide if there's nothing AND we don't have the alwaysShowAddButton flag
  if (pillars.length === 0 && customPillars.length === 0 && !alwaysShowAddButton) return null;

  const corePillars = pillars.filter(p => p.priority === 'core');
  const importantPillars = pillars.filter(p => p.priority === 'important');
  const niceToHavePillars = pillars.filter(p => p.priority === 'nice-to-have');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmed = inputValue.trim();
      // Don't add duplicates
      if (!customPillars.includes(trimmed) && !pillars.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
        onAddCustomPillar(trimmed);
      }
      setInputValue("");
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim()) {
      const trimmed = inputValue.trim();
      if (!customPillars.includes(trimmed) && !pillars.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
        onAddCustomPillar(trimmed);
      }
      setInputValue("");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h3 className="font-semibold">Focus Areas</h3>
        </div>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToDefaults}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
      
      {/* Pills display */}
      <div className="flex flex-wrap gap-2">
        {/* Core pillars */}
        {corePillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            name={pillar.name}
            priority={pillar.priority}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}
        
        {/* Important pillars */}
        {importantPillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            name={pillar.name}
            priority={pillar.priority}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}
        
        {/* Nice-to-have pillars */}
        {niceToHavePillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            name={pillar.name}
            priority={pillar.priority}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}

        {/* Custom pillars */}
        {customPillars.map((name) => (
          <CustomPillButton
            key={name}
            name={name}
            isSelected={selectedPillars.has(name)}
            onToggle={() => onTogglePillar(name)}
            onRemove={() => onRemoveCustomPillar(name)}
          />
        ))}
      </div>

      {/* Text input for custom focus areas */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom focus area..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddClick}
          disabled={!inputValue.trim()}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Core topics are selected by default. Add custom focus areas or toggle to customize.
      </p>
      
      {hasChanges && !isApplying && (
        <Button
          onClick={onApplyFocus}
          disabled={selectedPillars.size === 0}
          size="sm"
          className="w-full gap-2"
        >
          Apply Changes ({customPillars.length > 0 
            ? `+${customPillars.length} custom${removedTopics > 0 ? `, -${removedTopics} removed` : ''}`
            : removedTopics > 0 
              ? `-${removedTopics} topics` 
              : `${selectedPillars.size} topics`})
        </Button>
      )}
      
      {isApplying && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          {/* Stage indicators */}
          <div className="space-y-2">
            {FOCUS_STAGES.map((stage, idx) => {
              const isComplete = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-opacity",
                    isComplete && "text-muted-foreground opacity-60",
                    isCurrent && "text-foreground font-medium",
                    !isComplete && !isCurrent && "text-muted-foreground opacity-40"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                  )}
                  <span>{stage.label}</span>
                </div>
              );
            })}
          </div>
          
          {/* Progress bar */}
          <Progress value={overallProgress} className="h-2" />
          
          {/* Time indicators */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Elapsed: {formatTime(elapsed)}</span>
            {elapsed >= 90 ? (
              <span className="text-amber-600 dark:text-amber-400">Taking longer than expected...</span>
            ) : (
              <span>~{formatTime(estimatedRemaining)} remaining</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PillButtonProps {
  name: string;
  priority: 'core' | 'important' | 'nice-to-have';
  isSelected: boolean;
  onToggle: () => void;
}

function PillButton({ name, priority, isSelected, onToggle }: PillButtonProps) {
  const baseStyles = "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none";
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        baseStyles,
        isSelected
          ? selectedStyles[priority]
          : priorityStyles[priority]
      )}
    >
      {name}
      {isSelected && (
        <span className="ml-1.5 opacity-70">✓</span>
      )}
    </button>
  );
}

interface CustomPillButtonProps {
  name: string;
  isSelected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

function CustomPillButton({ name, isSelected, onToggle, onRemove }: CustomPillButtonProps) {
  const baseStyles = "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none flex items-center gap-1.5";
  
  return (
    <div
      className={cn(
        baseStyles,
        isSelected
          ? selectedStyles.custom
          : priorityStyles.custom
      )}
    >
      <button onClick={onToggle} className="flex items-center gap-1">
        {name}
        {isSelected && <span className="opacity-70">✓</span>}
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-1 hover:bg-background/20 rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
