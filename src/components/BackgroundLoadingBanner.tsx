import { Loader2, Check, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BackgroundLoadingBannerProps {
  isLoading: boolean;
  progress: number;
  total: number;
  currentStep: string | null;
  failedCount: number;
}

export function BackgroundLoadingBanner({
  isLoading,
  progress,
  total,
  currentStep,
  failedCount,
}: BackgroundLoadingBannerProps) {
  if (!isLoading && progress === 0) return null;

  const progressPercent = total > 0 ? (progress / total) * 100 : 0;
  const isComplete = !isLoading && progress >= total;

  // Auto-hide after completion
  if (isComplete && failedCount === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 w-80 transition-all",
        isComplete && failedCount > 0 && "border-destructive/50"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        ) : failedCount > 0 ? (
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <Check className="h-4 w-4 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {isLoading 
              ? `Loading resources (${progress}/${total})` 
              : failedCount > 0 
                ? `${progress - failedCount}/${total} loaded, ${failedCount} failed`
                : `All ${total} resources loaded`
            }
          </p>
          {isLoading && currentStep && (
            <p className="text-xs text-muted-foreground truncate">
              {currentStep}
            </p>
          )}
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-1.5" />
    </div>
  );
}