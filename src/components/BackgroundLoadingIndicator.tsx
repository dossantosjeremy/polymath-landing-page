import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackgroundLoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
  total: number;
  currentStep: string | null;
  failedCount?: number;
  className?: string;
}

export function BackgroundLoadingIndicator({
  isLoading,
  progress,
  total,
  currentStep,
  failedCount = 0,
  className,
}: BackgroundLoadingIndicatorProps) {
  if (!isLoading && progress === 0) return null;

  const isComplete = !isLoading && progress >= total;
  const hasFailures = failedCount > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        isComplete
          ? hasFailures
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-primary/10 text-primary",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isComplete ? (
        hasFailures ? (
          <X className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )
      ) : null}
      
      <span>
        {isLoading ? (
          <>Preparing {progress + 1}/{total}</>
        ) : isComplete ? (
          hasFailures ? (
            <>{progress}/{total} ready ({failedCount} failed)</>
          ) : (
            <>All {total} steps ready</>
          )
        ) : (
          <>{progress}/{total} cached</>
        )}
      </span>
    </div>
  );
}
