import { useState, useEffect } from "react";
import { Sparkles, Check, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface EnhancementStage {
  id: string;
  label: string;
  estimatedSeconds: number;
}

const AI_ENHANCEMENT_STAGES: EnhancementStage[] = [
  { id: 'searching', label: 'Searching for additional sources', estimatedSeconds: 8 },
  { id: 'analyzing', label: 'Analyzing domain authorities', estimatedSeconds: 12 },
  { id: 'synthesizing', label: 'Synthesizing new modules', estimatedSeconds: 15 },
  { id: 'merging', label: 'Merging with academic curriculum', estimatedSeconds: 5 },
];

interface AIEnhancementProgressProps {
  discipline: string;
}

export function AIEnhancementProgress({ discipline }: AIEnhancementProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const totalEstimatedSeconds = AI_ENHANCEMENT_STAGES.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Advance stages based on elapsed time
  useEffect(() => {
    let cumulativeTime = 0;
    for (let i = 0; i < AI_ENHANCEMENT_STAGES.length; i++) {
      cumulativeTime += AI_ENHANCEMENT_STAGES[i].estimatedSeconds;
      if (elapsed < cumulativeTime) {
        setCurrentStageIndex(i);
        return;
      }
    }
    // If we've exceeded all stages, stay on the last one
    setCurrentStageIndex(AI_ENHANCEMENT_STAGES.length - 1);
  }, [elapsed]);

  const overallProgress = Math.min((elapsed / totalEstimatedSeconds) * 100, 95);
  const estimatedRemaining = Math.max(totalEstimatedSeconds - elapsed, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
        <span className="font-medium">Enhancing Syllabus with AI</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {discipline}
        </span>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {AI_ENHANCEMENT_STAGES.map((stage, idx) => {
          const isComplete = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          return (
            <div 
              key={stage.id}
              className={cn(
                "flex items-center gap-3 text-sm transition-opacity",
                isPending && "opacity-40"
              )}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isComplete ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                isCurrent && "text-foreground font-medium",
                isComplete && "text-muted-foreground",
                isPending && "text-muted-foreground"
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <Progress value={overallProgress} className="h-2" />

      {/* Time Indicators */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Elapsed: {formatTime(elapsed)}</span>
        <span>Est. remaining: ~{formatTime(estimatedRemaining)}</span>
      </div>
    </div>
  );
}
