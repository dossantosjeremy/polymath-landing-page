import { createContext, useContext, ReactNode } from "react";
import { LearningPathConstraints, PruningStats } from "@/components/SmartLearningPathSettings";

export interface Module {
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
}

export interface DiscoveredSource {
  institution: string;
  courseName: string;
  url: string;
  type: string;
  content?: string;
  moduleCount?: number;
}

export interface SyllabusData {
  discipline: string;
  modules: Module[];
  source: string;
  rawSources?: DiscoveredSource[];
  timestamp: string;
  pruningStats?: PruningStats;
  learningPathSettings?: LearningPathConstraints;
  isAdHoc?: boolean;
  isAIEnhanced?: boolean;
  compositionType?: 'single' | 'composite_program' | 'vocational';
  derivedFrom?: string[];
  searchTerm?: string;
  topicPillars?: Array<{
    name: string;
    searchTerms: string[];
    recommendedSources: string[];
    priority: 'core' | 'important' | 'nice-to-have';
  }>;
  narrativeFlow?: string;
  synthesisRationale?: string;
  discoveredAuthorities?: Array<{
    name: string;
    domain: string;
    authorityType: 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';
    authorityReason: string;
    focusAreas: string[];
  }>;
}

interface SyllabusContextValue {
  // Data
  syllabusData: SyllabusData | null;
  discipline: string;
  path: string;
  loading: boolean;
  regenerating: boolean;
  
  // AI State
  aiStatus: 'idle' | 'loading' | 'ready';
  showAIContent: boolean;
  handleEnhanceWithAI: () => Promise<void>;
  handleAIViewToggle: (enabled: boolean) => void;
  
  // Sources
  originalSources: DiscoveredSource[];
  selectedSources: Set<number>;
  toggleSourceSelection: (index: number) => void;
  selectAllSources: () => void;
  deselectAllSources: () => void;
  regenerateWithSelectedSources: () => Promise<void>;
  
  // Learning Settings
  learningSettings: LearningPathConstraints;
  pruningStats: PruningStats | undefined;
  handleApplyConstraints: (constraints: LearningPathConstraints) => Promise<void>;
  applyingConstraints: boolean;
  
  // Save/Export
  saving: boolean;
  isSaved: boolean;
  saveSyllabus: () => Promise<void>;
  handleExportMarkdown: () => void;
  
  // Helpers
  getDomainShortName: (url: string) => string;
  extractCourseCode: (url: string, courseName?: string) => string;
  getSourceColorByUrl: (url: string) => string;
  regenerationKey: number;
  
  // URL params
  useCache: boolean;
  isAdHoc: boolean;
  useAIEnhanced: boolean;
  savedId: string | null;
}

const SyllabusContext = createContext<SyllabusContextValue | null>(null);

export function useSyllabusContext() {
  const context = useContext(SyllabusContext);
  if (!context) {
    throw new Error("useSyllabusContext must be used within a SyllabusProvider");
  }
  return context;
}

interface SyllabusProviderProps {
  children: ReactNode;
  value: SyllabusContextValue;
}

export function SyllabusProvider({ children, value }: SyllabusProviderProps) {
  return (
    <SyllabusContext.Provider value={value}>
      {children}
    </SyllabusContext.Provider>
  );
}
