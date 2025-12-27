import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface TopicFocusPillsProps {
  pillars: TopicPillar[];
  selectedPillars: Set<string>;
  onTogglePillar: (pillarName: string) => void;
  onApplyFocus: () => void;
  onResetToDefaults: () => void;
  isApplying?: boolean;
}

const priorityStyles: Record<string, string> = {
  core: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
  important: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
  "nice-to-have": "bg-muted text-muted-foreground border-border hover:bg-muted/80",
};

const selectedStyles: Record<string, string> = {
  core: "bg-primary text-primary-foreground border-primary",
  important: "bg-violet-500 text-white border-violet-500",
  "nice-to-have": "bg-foreground text-background border-foreground",
};

export function TopicFocusPills({
  pillars,
  selectedPillars,
  onTogglePillar,
  onApplyFocus,
  onResetToDefaults,
  isApplying = false,
}: TopicFocusPillsProps) {
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track if there are changes from defaults (all core/important selected)
  useEffect(() => {
    const defaultSelected = new Set(
      pillars
        .filter(p => p.priority === 'core' || p.priority === 'important')
        .map(p => p.name)
    );
    
    const isDefault = 
      selectedPillars.size === defaultSelected.size &&
      [...selectedPillars].every(p => defaultSelected.has(p));
    
    setHasChanges(!isDefault);
  }, [pillars, selectedPillars]);

  if (pillars.length === 0) return null;

  const corePillars = pillars.filter(p => p.priority === 'core');
  const importantPillars = pillars.filter(p => p.priority === 'important');
  const niceToHavePillars = pillars.filter(p => p.priority === 'nice-to-have');

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
      
      <div className="flex flex-wrap gap-2">
        {/* Core pillars */}
        {corePillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            pillar={pillar}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}
        
        {/* Important pillars */}
        {importantPillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            pillar={pillar}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}
        
        {/* Nice-to-have pillars */}
        {niceToHavePillars.map((pillar) => (
          <PillButton
            key={pillar.name}
            pillar={pillar}
            isSelected={selectedPillars.has(pillar.name)}
            onToggle={() => onTogglePillar(pillar.name)}
          />
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Core topics are selected by default. Toggle to customize your focus areas.
      </p>
      
      {hasChanges && (
        <Button
          onClick={onApplyFocus}
          disabled={isApplying || selectedPillars.size === 0}
          size="sm"
          className="w-full gap-2"
        >
          {isApplying ? (
            <>Applying Focus...</>
          ) : (
            <>Apply Changes ({selectedPillars.size} topics)</>
          )}
        </Button>
      )}
    </div>
  );
}

interface PillButtonProps {
  pillar: TopicPillar;
  isSelected: boolean;
  onToggle: () => void;
}

function PillButton({ pillar, isSelected, onToggle }: PillButtonProps) {
  const baseStyles = "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none";
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        baseStyles,
        isSelected
          ? selectedStyles[pillar.priority]
          : priorityStyles[pillar.priority]
      )}
    >
      {pillar.name}
      {isSelected && (
        <span className="ml-1.5 opacity-70">✓</span>
      )}
    </button>
  );
}
