"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { BookOpen, Scale, Library } from "lucide-react";

export const DEPTH_STEPS = [
  {
    label: "Bare minimum",
    depth: "overview" as const,
    coverage: 40,
    description: "Only core concepts required to function",
    includes: [
      "Covers 40% of the full curriculum",
      "Focuses strictly on essentials",
      "Fastest path to basic competency",
    ],
    icon: BookOpen,
  },
  {
    label: "Balanced",
    depth: "standard" as const,
    coverage: 75,
    description: "Recommended trade-off between depth and time",
    includes: [
      "Covers 75% of the full curriculum",
      "Includes most practical and applied topics",
      "Best value for time invested",
    ],
    icon: Scale,
  },
  {
    label: "Most complete",
    depth: "detailed" as const,
    coverage: 100,
    description: "Full curriculum, no pruning",
    includes: [
      "Covers 100% of the full curriculum",
      "Includes theory, context, and advanced topics",
      "Comprehensive mastery path",
    ],
    icon: Library,
  },
];

interface LearningDepthSliderProps {
  value: number; // 0, 1, or 2
  onChange: (index: number) => void;
  estimatedHours?: number;
  estimatedWeeks?: number;
  disabled?: boolean;
}

export function LearningDepthSlider({
  value,
  onChange,
  estimatedHours,
  estimatedWeeks,
  disabled = false,
}: LearningDepthSliderProps) {
  const current = DEPTH_STEPS[value] || DEPTH_STEPS[1];
  const Icon = current.icon;

  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={cn("w-full", disabled && "opacity-60 pointer-events-none")}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Card - Slider */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">
              Choose your learning depth
            </h4>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xl font-semibold">{current.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>

          {/* Slider */}
          <div className="pt-2">
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              min={0}
              max={2}
              step={1}
              className="w-full"
              disabled={disabled}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Min</span>
              <span>Balanced</span>
              <span>Full</span>
            </div>
          </div>

          {/* Coverage indicator */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Coverage</span>
            <span className="font-semibold text-primary">{current.coverage}%</span>
          </div>
        </div>

        {/* Right Card - What this includes */}
        <div className="rounded-lg border bg-muted/30 p-5 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            What this includes
          </h4>
          
          <ul className="space-y-2">
            {current.includes.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Time estimate if provided */}
          {estimatedHours !== undefined && (
            <div className="pt-3 border-t space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated time</span>
                <span className="font-medium">~{estimatedHours} hours</span>
              </div>
              {estimatedWeeks !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">At 5 hrs/week</span>
                  <span className="font-medium">~{estimatedWeeks} weeks</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
