import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GenerationStage {
  id: string;
  label: string;
  description: string;
  estimatedSeconds: number;
}

const GENERATION_STAGES: GenerationStage[] = [
  { id: 'analyzing', label: 'Analyzing Topic', description: 'Understanding topic structure and pillars...', estimatedSeconds: 3 },
  { id: 'discovering', label: 'Discovering Sources', description: 'Finding authoritative syllabi from universities...', estimatedSeconds: 8 },
  { id: 'fetching', label: 'Fetching Content', description: 'Retrieving full syllabus content from sources...', estimatedSeconds: 12 },
  { id: 'extracting', label: 'Extracting Modules', description: 'Parsing and extracting course modules...', estimatedSeconds: 8 },
  { id: 'synthesizing', label: 'Synthesizing Curriculum', description: 'Merging sources into comprehensive curriculum...', estimatedSeconds: 15 },
  { id: 'caching', label: 'Finalizing', description: 'Caching curriculum for future learners...', estimatedSeconds: 2 },
];

interface GenerationProgressIndicatorProps {
  discipline: string;
  isAdHoc?: boolean;
  useAIEnhanced?: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
};

export function GenerationProgressIndicator({ 
  discipline, 
  isAdHoc, 
  useAIEnhanced 
}: GenerationProgressIndicatorProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);

  const totalEstimatedTime = GENERATION_STAGES.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Progress through stages based on elapsed time
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < GENERATION_STAGES.length; i++) {
      accumulatedTime += GENERATION_STAGES[i].estimatedSeconds;
      if (elapsedTime < accumulatedTime) {
        setCurrentStageIndex(i);
        // Calculate progress within current stage
        const stageStartTime = accumulatedTime - GENERATION_STAGES[i].estimatedSeconds;
        const stageElapsed = elapsedTime - stageStartTime;
        const stagePercent = Math.min(95, (stageElapsed / GENERATION_STAGES[i].estimatedSeconds) * 100);
        setStageProgress(stagePercent);
        break;
      }
    }
    // If we've exceeded total time, stay on last stage with high progress
    if (elapsedTime >= totalEstimatedTime) {
      setCurrentStageIndex(GENERATION_STAGES.length - 1);
      setStageProgress(95);
    }
  }, [elapsedTime, totalEstimatedTime]);

  const currentStage = GENERATION_STAGES[currentStageIndex];
  const overallProgress = Math.min(95, (elapsedTime / totalEstimatedTime) * 100);
  const estimatedRemaining = Math.max(0, totalEstimatedTime - elapsedTime);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Stage steps indicator */}
      <div className="flex items-center gap-1 md:gap-2">
        {GENERATION_STAGES.map((stage, idx) => (
          <div key={stage.id} className="flex items-center">
            <div 
              className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-medium transition-all duration-300",
                idx < currentStageIndex 
                  ? "bg-primary text-primary-foreground" 
                  : idx === currentStageIndex 
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                    : "bg-muted text-muted-foreground"
              )}
            >
              {idx < currentStageIndex ? (
                <Check className="h-4 w-4" />
              ) : idx === currentStageIndex ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < GENERATION_STAGES.length - 1 && (
              <div 
                className={cn(
                  "w-4 md:w-8 h-0.5 transition-colors duration-300",
                  idx < currentStageIndex ? "bg-primary" : "bg-muted"
                )} 
              />
            )}
          </div>
        ))}
      </div>

      {/* Current stage info */}
      <div className="text-center space-y-2 max-w-md">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">
            Step {currentStageIndex + 1} of {GENERATION_STAGES.length}
          </span>
        </div>
        <h3 className="text-xl font-semibold">{currentStage.label}</h3>
        <p className="text-sm text-muted-foreground">{currentStage.description}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md space-y-2">
        <Progress value={overallProgress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Elapsed: {formatTime(elapsedTime)}</span>
          <span>Est. remaining: ~{formatTime(estimatedRemaining)}</span>
        </div>
      </div>

      {/* Context badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Badge variant="secondary">
          Building: {discipline}
        </Badge>
        {isAdHoc && (
          <Badge variant="outline" className="border-[hsl(var(--gold))]/50 text-[hsl(var(--gold))]">
            ✨ Web Sourced
          </Badge>
        )}
        {useAIEnhanced && (
          <Badge variant="outline" className="border-primary/50 text-primary">
            🧠 AI-Enhanced
          </Badge>
        )}
      </div>
    </div>
  );
}
