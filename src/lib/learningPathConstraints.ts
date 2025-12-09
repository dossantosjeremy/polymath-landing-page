// Learning Path Constraints Types and Logic

export interface SmartConstraints {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  hoursPerWeek: number;
  durationWeeks: number;
  // Auto-computed (read-only)
  recommendedDepth: 'overview' | 'standard' | 'detailed' | null;
  totalAvailableHours: number;
  estimatedCompletionDate: Date;
  feasibilityStatus: 'valid' | 'impossible' | 'warning';
}

export interface FeasibilityResult {
  status: 'valid' | 'impossible' | 'warning';
  message: string;
  suggestions: Array<{
    text: string;
    action: () => Partial<{ hoursPerWeek: number; durationWeeks: number; skillLevel: 'beginner' | 'intermediate' | 'advanced' }>;
  }>;
  minimumHoursNeeded?: number;
  minimumWeeksNeeded?: number;
}

export interface DepthResult {
  depth: 'overview' | 'standard' | 'detailed' | null;
  feasible: boolean;
  coveragePercentage: number;
}

// Base hours needed for each depth level
export const DEPTH_THRESHOLDS = {
  overview: { min: 5, typical: 10 },      // Quick introduction
  standard: { min: 15, typical: 30 },     // Solid understanding
  detailed: { min: 50, typical: 80 },     // Comprehensive mastery
};

// Skill level time multipliers
export const SKILL_MULTIPLIERS: Record<string, number> = {
  beginner: 1.3,      // Beginners need 30% more time
  intermediate: 1.0,  // Baseline
  advanced: 0.7,      // Experts are faster
};

// Depth descriptions
export const DEPTH_DESCRIPTIONS: Record<string, string> = {
  overview: 'Quick introduction covering core concepts only',
  standard: 'Balanced curriculum with solid understanding',
  detailed: 'Comprehensive mastery with deep exploration',
};

// Coverage percentages per depth
export const DEPTH_COVERAGE: Record<string, number> = {
  overview: 40,
  standard: 75,
  detailed: 100,
};

/**
 * Compute the recommended depth based on available hours and skill level
 */
export function computeRecommendedDepth(
  totalHours: number,
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
): DepthResult {
  const multiplier = SKILL_MULTIPLIERS[skillLevel];
  const adjustedHours = totalHours / multiplier;

  if (adjustedHours < DEPTH_THRESHOLDS.overview.min) {
    return { depth: null, feasible: false, coveragePercentage: 0 };
  }
  if (adjustedHours < DEPTH_THRESHOLDS.standard.min) {
    return { depth: 'overview', feasible: true, coveragePercentage: DEPTH_COVERAGE.overview };
  }
  if (adjustedHours < DEPTH_THRESHOLDS.detailed.min) {
    return { depth: 'standard', feasible: true, coveragePercentage: DEPTH_COVERAGE.standard };
  }
  return { depth: 'detailed', feasible: true, coveragePercentage: DEPTH_COVERAGE.detailed };
}

/**
 * Validate if the learning plan is feasible
 */
export function validateFeasibility(
  hoursPerWeek: number,
  durationWeeks: number,
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
): FeasibilityResult {
  const totalHours = hoursPerWeek * durationWeeks;
  const multiplier = SKILL_MULTIPLIERS[skillLevel];
  const minRequired = DEPTH_THRESHOLDS.overview.min * multiplier;

  // Check impossible scenario
  if (totalHours < minRequired) {
    const minHoursPerWeekNeeded = Math.ceil(minRequired / durationWeeks);
    const minWeeksNeeded = Math.ceil(minRequired / hoursPerWeek);

    return {
      status: 'impossible',
      message: `Your ${totalHours} available hours aren't enough for even an overview (minimum ${Math.ceil(minRequired)} hours needed).`,
      suggestions: [
        {
          text: `Increase to ${minHoursPerWeekNeeded} hours/week`,
          action: () => ({ hoursPerWeek: minHoursPerWeekNeeded }),
        },
        {
          text: `Extend duration to ${minWeeksNeeded} weeks`,
          action: () => ({ durationWeeks: minWeeksNeeded }),
        },
      ],
      minimumHoursNeeded: minRequired,
      minimumWeeksNeeded: minWeeksNeeded,
    };
  }

  // Check for warnings
  if (hoursPerWeek > 40) {
    return {
      status: 'warning',
      message: 'This is an intensive schedule (over 40 hours/week). Make sure you have the time.',
      suggestions: [
        {
          text: 'Reduce to 20 hours/week',
          action: () => ({ hoursPerWeek: 20 }),
        },
      ],
    };
  }

  // Beginner with very short duration
  if (skillLevel === 'beginner' && durationWeeks < 2 && hoursPerWeek < 10) {
    return {
      status: 'warning',
      message: 'As a beginner with limited time, you may find this pace challenging.',
      suggestions: [
        {
          text: 'Extend to 4 weeks',
          action: () => ({ durationWeeks: 4 }),
        },
        {
          text: 'Increase to 5 hours/week',
          action: () => ({ hoursPerWeek: 5 }),
        },
      ],
    };
  }

  return {
    status: 'valid',
    message: 'Your plan is achievable! This pace allows comfortable learning with review time.',
    suggestions: [],
  };
}

/**
 * Convert SmartConstraints to legacy LearningPathConstraints format
 */
export function toLegacyConstraints(smart: SmartConstraints): {
  depth: 'overview' | 'standard' | 'detailed';
  hoursPerWeek: number;
  goalDate?: Date;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
} {
  return {
    depth: smart.recommendedDepth || 'standard',
    hoursPerWeek: smart.hoursPerWeek,
    goalDate: smart.estimatedCompletionDate,
    skillLevel: smart.skillLevel,
  };
}

/**
 * Calculate estimated completion date from duration
 */
export function calculateCompletionDate(durationWeeks: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + durationWeeks * 7);
  return date;
}
