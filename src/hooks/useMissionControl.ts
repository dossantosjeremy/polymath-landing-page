import { useState, useCallback } from 'react';

export type ViewMode = 'draft' | 'active';

export interface MissionControlStep {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  description?: string;
  isCapstone?: boolean;
  estimatedHours?: number;
  priority?: 'core' | 'important' | 'nice-to-have';
  isHiddenForTime?: boolean;
  isHiddenForDepth?: boolean;
  originalIndex: number;
}

export interface MissionControlState {
  mode: ViewMode;
  selectedSteps: Set<number>;
  activeStepIndex: number | null;
  isConfirming: boolean;
  confirmedSteps: MissionControlStep[];
}

interface UseMissionControlProps {
  steps: MissionControlStep[];
  onConfirm: (selectedStepIndices: number[]) => Promise<void>;
}

export function useMissionControl({ steps, onConfirm }: UseMissionControlProps) {
  const [mode, setMode] = useState<ViewMode>('draft');
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(() => 
    new Set(steps.map((_, idx) => idx))
  );
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSteps, setConfirmedSteps] = useState<MissionControlStep[]>([]);

  // Reset selected steps when steps change
  const resetSelection = useCallback(() => {
    setSelectedSteps(new Set(steps.map((_, idx) => idx)));
  }, [steps]);

  // Toggle step selection in draft mode
  const toggleStep = useCallback((index: number) => {
    setSelectedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Select all steps
  const selectAll = useCallback(() => {
    setSelectedSteps(new Set(steps.map((_, idx) => idx)));
  }, [steps]);

  // Deselect all steps
  const deselectAll = useCallback(() => {
    setSelectedSteps(new Set());
  }, []);

  // Confirm selection and transition to active mode
  const confirmPath = useCallback(async () => {
    if (selectedSteps.size === 0) return;
    
    setIsConfirming(true);
    try {
      const selectedIndices = Array.from(selectedSteps).sort((a, b) => a - b);
      await onConfirm(selectedIndices);
      
      // Store confirmed steps
      const confirmed = selectedIndices.map(idx => steps[idx]);
      setConfirmedSteps(confirmed);
      
      // Set first step as active
      if (confirmed.length > 0) {
        setActiveStepIndex(0);
      }
      
      setMode('active');
    } finally {
      setIsConfirming(false);
    }
  }, [selectedSteps, steps, onConfirm]);

  // Navigate to a step in active mode
  const navigateToStep = useCallback((index: number) => {
    setActiveStepIndex(index);
  }, []);

  // Re-enable a previously disabled step (change of mind)
  const reEnableStep = useCallback(async (originalIndex: number) => {
    // Add to selected steps
    setSelectedSteps(prev => new Set([...prev, originalIndex]));
    
    // Find the step and add to confirmed steps
    const step = steps.find(s => s.originalIndex === originalIndex);
    if (step) {
      setConfirmedSteps(prev => {
        // Insert in correct position based on originalIndex
        const newSteps = [...prev, step].sort((a, b) => a.originalIndex - b.originalIndex);
        return newSteps;
      });
    }
  }, [steps]);

  // Get the current active step
  const currentStep = activeStepIndex !== null ? confirmedSteps[activeStepIndex] : null;

  // Get count statistics
  const stats = {
    total: steps.length,
    selected: selectedSteps.size,
    estimatedHours: steps
      .filter((_, idx) => selectedSteps.has(idx))
      .reduce((acc, s) => acc + (s.estimatedHours || 1), 0),
  };

  return {
    mode,
    selectedSteps,
    activeStepIndex,
    isConfirming,
    confirmedSteps,
    currentStep,
    stats,
    toggleStep,
    selectAll,
    deselectAll,
    confirmPath,
    navigateToStep,
    reEnableStep,
    resetSelection,
  };
}
