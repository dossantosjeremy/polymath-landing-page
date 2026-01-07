import { BookOpen, Settings, Library, CheckCircle2, Lock } from "lucide-react";
import { NestedTabs, NestedTabItem } from "@/components/ui/nested-tabs";
import { ContentTab } from "./ContentTab";
import { SyllabusTab } from "./SyllabusTab";
import { SourcesTab } from "./SourcesTab";
import { SyllabusProvider, SyllabusData, DiscoveredSource, MissionControlPersistedState, useSyllabusContext } from "./SyllabusContext";
import { LearningPathConstraints, PruningStats } from "@/components/SmartLearningPathSettings";
import { BackgroundLoadingBanner } from "@/components/BackgroundLoadingBanner";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface SyllabusLayoutProps {
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
  
  // Source Confirmation (Epistemic Gate)
  sourcesConfirmed: boolean;
  confirmSources: () => void;
  
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
  
  // Active tab (controlled)
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  
  // Mission Control State (persisted across tabs)
  missionControlState: MissionControlPersistedState | null;
  setMissionControlState: (state: MissionControlPersistedState) => void;
  
  // Topic Focus Pills
  selectedPillars: Set<string>;
  customPillars: string[];
  togglePillar: (pillarName: string) => void;
  addCustomPillar: (pillarName: string) => void;
  removeCustomPillar: (pillarName: string) => void;
  regenerateWithPillars: () => Promise<void>;
  isApplyingPillars: boolean;
  
  // Pillar Inference (for syllabi missing focus areas)
  inferPillars: () => Promise<void>;
  isInferringPillars: boolean;
  
  // Background Resource Loading
  backgroundLoadingState: {
    isLoading: boolean;
    progress: number;
    total: number;
    currentStep: string | null;
    failedCount: number;
  };
  startBackgroundLoading: (stepTitles: string[]) => void;
}

export function SyllabusLayout(props: SyllabusLayoutProps) {
  const {
    activeTab = "sources",
    onTabChange,
    backgroundLoadingState,
    ...contextValue
  } = props;

  // Include backgroundLoadingState in context value
  const fullContextValue = { ...contextValue, backgroundLoadingState };

  return (
    <SyllabusProvider value={fullContextValue}>
      <SyllabusLayoutInner activeTab={activeTab} onTabChange={onTabChange} />
      
      {/* Background Loading Banner */}
      <BackgroundLoadingBanner
        isLoading={backgroundLoadingState.isLoading}
        progress={backgroundLoadingState.progress}
        total={backgroundLoadingState.total}
        currentStep={backgroundLoadingState.currentStep}
        failedCount={backgroundLoadingState.failedCount}
      />
    </SyllabusProvider>
  );
}

// Inner component that uses context - tabs are defined inside the provider tree
function SyllabusLayoutInner({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: string; 
  onTabChange?: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const { sourcesConfirmed } = useSyllabusContext();

  const tabs: NestedTabItem[] = [
    {
      value: "sources",
      label: (
        <span className="flex items-center gap-1.5">
          {t('syllabus.sources')}
          {sourcesConfirmed && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
        </span>
      ),
      icon: <Library className="h-4 w-4" />,
      content: <SourcesTab />,
    },
    {
      value: "syllabus",
      label: (
        <span className="flex items-center gap-1.5">
          {t('syllabus.overview')}
          {!sourcesConfirmed && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
      ),
      icon: <Settings className="h-4 w-4" />,
      content: <SyllabusTab />,
    },
    {
      value: "content",
      label: (
        <span className="flex items-center gap-1.5">
          {t('syllabus.content')}
          {!sourcesConfirmed && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
      ),
      icon: <BookOpen className="h-4 w-4" />,
      content: <ContentTab />,
    },
  ];

  return (
    <NestedTabs
      tabs={tabs}
      value={activeTab}
      onValueChange={onTabChange}
      className="w-full"
    />
  );
}
