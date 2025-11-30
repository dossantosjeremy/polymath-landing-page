import { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, Scissors, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { PruningStats } from "./LearningPathSettings";

interface DiscoveredSource {
  url: string;
  courseName: string;
  institution: string;
  type: string;
  content?: string;
  moduleCount?: number;
}

interface CurriculumAuditCardProps {
  rawSources: DiscoveredSource[];
  pruningStats?: PruningStats;
  onRestoreAll: () => void;
  getDomainShortName: (url: string) => string;
  extractCourseCode: (url: string, courseName: string) => string;
  getSourceColorByUrl: (url: string) => string;
}

export function CurriculumAuditCard({
  rawSources,
  pruningStats,
  onRestoreAll,
  getDomainShortName,
  extractCourseCode,
  getSourceColorByUrl,
}: CurriculumAuditCardProps) {
  const [gapListOpen, setGapListOpen] = useState(false);

  // Calculate match score based on pruning stats
  const matchScore = pruningStats
    ? Math.round(((pruningStats.finalVisibleSteps / pruningStats.fullCurriculumSteps) * 100))
    : 100;

  // Get primary source for benchmark display
  const primarySource = rawSources[0];
  const sourceName = primarySource
    ? `${primarySource.institution} ${extractCourseCode(primarySource.url, primarySource.courseName)}`
    : "Top University Syllabus";

  // Combine pruned items
  const prunedItems = [
    ...(pruningStats?.hiddenByDepthTitles || []).map(title => ({
      title,
      reason: 'Low Relevance' as const,
      explanation: 'Focuses on supplementary topics not essential for your learning goals.',
    })),
    ...(pruningStats?.hiddenByTimeTitles || []).map(title => ({
      title,
      reason: 'Time Constraint' as const,
      explanation: 'Removed to fit your weekly time budget while maintaining core concepts.',
    })),
  ];

  const hasPruning = pruningStats && (pruningStats.stepsHiddenByDepth > 0 || pruningStats.stepsHiddenByTime > 0);

  // Get distinct color for the progress ring based on score
  const getProgressColor = (score: number) => {
    if (score >= 85) return "hsl(var(--primary))"; // Blue for high match
    if (score >= 70) return "hsl(45 93% 47%)"; // Gold for medium-high
    return "hsl(var(--chart-2))"; // Amber for lower scores
  };

  return (
    <div className="border bg-card shadow-sm p-6">
      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        {/* Left Side - The Scoreboard */}
        <div className="flex flex-col items-center text-center space-y-4 border-r pr-6">
          {/* Circular Progress Ring */}
          <div className="relative w-40 h-40">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={getProgressColor(matchScore)}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - matchScore / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold" style={{ color: getProgressColor(matchScore) }}>
                {matchScore}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Match</div>
            </div>
          </div>

          {/* Badge and Label */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Ivy League Benchmark</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Matches <span className="font-medium text-foreground">{sourceName}</span>
            </p>
          </div>
        </div>

        {/* Right Side - Optimization Report */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Optimization Report</h3>
            {hasPruning ? (
              <p className="text-sm text-muted-foreground">
                You saved <span className="font-semibold text-foreground">{pruningStats.hoursSaved} hours</span> of study time by prioritizing high-impact topics.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This syllabus includes the complete curriculum from authoritative sources.
              </p>
            )}
          </div>

          {/* Curriculum Sources Pills */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {rawSources.map((source, idx) => {
                const baseName = getDomainShortName(source.url);
                const courseSuffix = extractCourseCode(source.url, source.courseName);
                const label = courseSuffix ? `${baseName} (${courseSuffix})` : baseName;
                
                return (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 text-xs font-medium border transition-colors hover:opacity-80",
                      getSourceColorByUrl(source.url)
                    )}
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Collapsible Gap List */}
          {hasPruning && prunedItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setGapListOpen(!gapListOpen)}
                className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    What was pruned (and why):
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {prunedItems.length} {prunedItems.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
                {gapListOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {gapListOpen && (
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {prunedItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-sm">{item.title}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs cursor-help",
                                    item.reason === 'Low Relevance'
                                      ? "border-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)] bg-[hsl(45,93%,47%)]/5"
                                      : "border-primary text-primary bg-primary/5"
                                  )}
                                >
                                  [{item.reason}]
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">{item.explanation}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Restore All Button */}
          {hasPruning && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestoreAll}
                className="text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore All Topics
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
