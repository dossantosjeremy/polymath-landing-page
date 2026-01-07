import { useState, useCallback, useEffect, useRef } from 'react';

export type ViewMode = 'draft' | 'active';

// Pedagogical function types from Course Grammar
export type PedagogicalFunction = 
  | 'pre_exposure'
  | 'concept_exposition'
  | 'expert_demonstration'
  | 'guided_practice'
  | 'independent_practice'
  | 'assessment_checkpoint';

// Bloom's cognitive levels
export type CognitiveLevel = 
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

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
  isAIDiscovered?: boolean;
  fromCustomPillar?: string;
  originalIndex: number;
  // Pedagogical metadata from Course Grammar
  learningObjective?: string;
  pedagogicalFunction?: PedagogicalFunction;
  cognitiveLevel?: CognitiveLevel;
  narrativePosition?: string;
  evidenceOfMastery?: string;
  pillar?: string;
}

export interface MissionControlState {
  mode: ViewMode;
  selectedSteps: Set<number>;
  activeStepIndex: number | null;
  isConfirming: boolean;
  confirmedSteps: MissionControlStep[];
}

// Serializable version for persistence across tab switches
export interface MissionControlPersistedState {
  mode: 'draft' | 'active';
  confirmedStepTitles: string[];
  activeStepIndex: number | null;
  selectedStepIndices: number[];
}

interface UseMissionControlProps {
  steps: MissionControlStep[];
  onConfirm: (selectedStepIndices: number[]) => Promise<void>;
  // NEW: Optional initial state from context (for persistence across tabs)
  initialPersistedState?: MissionControlPersistedState | null;
  // NEW: Callback to sync state changes back to context
  onStateChange?: (state: MissionControlPersistedState) => void;
  // NEW: Callback when path is confirmed (for background loading)
  onPathConfirmed?: (confirmedStepTitles: string[]) => void;
}

export function useMissionControl({ 
  steps, 
  onConfirm, 
  initialPersistedState,
  onStateChange,
  onPathConfirmed,
}: UseMissionControlProps) {
  // Initialize from persisted state if available
  const initFromPersisted = useCallback(() => {
    if (initialPersistedState && initialPersistedState.mode === 'active') {
      // Reconstruct confirmed steps from titles
      const confirmedSteps = initialPersistedState.confirmedStepTitles
        .map(title => steps.find(s => s.title === title))
        .filter((s): s is MissionControlStep => s !== undefined);
      
      return {
        mode: initialPersistedState.mode as ViewMode,
        selectedSteps: new Set(initialPersistedState.selectedStepIndices),
        activeStepIndex: initialPersistedState.activeStepIndex,
        confirmedSteps,
      };
    }
    return null;
  }, [initialPersistedState, steps]);

  const persistedInit = initFromPersisted();

  const [mode, setMode] = useState<ViewMode>(persistedInit?.mode || 'draft');
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(() => 
    persistedInit?.selectedSteps || new Set(steps.map((_, idx) => idx))
  );
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(
    persistedInit?.activeStepIndex ?? null
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSteps, setConfirmedSteps] = useState<MissionControlStep[]>(
    persistedInit?.confirmedSteps || []
  );

  // Track previous steps to detect changes
  const prevStepsRef = useRef<MissionControlStep[]>(steps);
  const hasInitialized = useRef(persistedInit !== null);

  // Sync state changes to context
  useEffect(() => {
    if (onStateChange && hasInitialized.current) {
      onStateChange({
        mode,
        confirmedStepTitles: confirmedSteps.map(s => s.title),
        activeStepIndex,
        selectedStepIndices: Array.from(selectedSteps),
      });
    }
  }, [mode, confirmedSteps, activeStepIndex, selectedSteps, onStateChange]);

  // Reset state when steps change (e.g., after regeneration)
  useEffect(() => {
    const stepsChanged = steps.length !== prevStepsRef.current.length ||
      steps.some((s, i) => s.title !== prevStepsRef.current[i]?.title);
    
    if (stepsChanged && hasInitialized.current) {
      setMode('draft');
      setSelectedSteps(new Set(steps.map((_, idx) => idx)));
      setActiveStepIndex(null);
      setConfirmedSteps([]);
      prevStepsRef.current = steps;
    } else if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevStepsRef.current = steps;
    }
  }, [steps]);

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
      
      // Trigger background loading for all confirmed steps
      if (onPathConfirmed) {
        onPathConfirmed(confirmed.map(s => s.title));
      }
    } finally {
      setIsConfirming(false);
    }
  }, [selectedSteps, steps, onConfirm, onPathConfirmed]);

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
