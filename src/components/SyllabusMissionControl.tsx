import { useState, useEffect, useMemo } from "react";
import { CurriculumMetroMap } from "@/components/CurriculumMetroMap";
import { StagePanel } from "@/components/StagePanel";
import { useMissionControl, MissionControlStep, MissionControlPersistedState } from "@/hooks/useMissionControl";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Map, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Module {
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

interface DiscoveredSource {
  institution: string;
  courseName: string;
  url: string;
  type: string;
  content?: string;
  moduleCount?: number;
}

interface SyllabusMissionControlProps {
  modules: Module[];
  discipline: string;
  rawSources?: DiscoveredSource[];
  onConfirm: (selectedStepIndices: number[]) => Promise<void>;
  getDomainShortName: (url: string) => string;
  extractCourseCode: (url: string, courseName?: string) => string;
  getSourceColorByUrl: (url: string) => string;
  regenerationKey?: number;
  aiEnabled?: boolean;
  initialPersistedState?: MissionControlPersistedState | null;
  onStateChange?: (state: MissionControlPersistedState) => void;
  onPathConfirmed?: (stepTitles: string[]) => void;
}

export function SyllabusMissionControl({
  modules,
  discipline,
  rawSources = [],
  onConfirm,
  getDomainShortName,
  extractCourseCode,
  getSourceColorByUrl,
  regenerationKey = 0,
  aiEnabled = true,
  initialPersistedState,
  onStateChange,
  onPathConfirmed,
}: SyllabusMissionControlProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Transform modules to MissionControlStep format
  const steps: MissionControlStep[] = useMemo(() => {
    return modules
      .filter(m => !m.isHiddenForTime && !m.isHiddenForDepth)
      .map((module, idx) => ({
        ...module,
        originalIndex: idx,
      }));
  }, [modules, regenerationKey]);

  const {
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
  } = useMissionControl({ 
    steps, 
    onConfirm,
    initialPersistedState,
    onStateChange,
    onPathConfirmed,
  });

  const syllabusUrls = rawSources.map(s => s.url);

  // Metro Map Component
  const metroMap = (
    <CurriculumMetroMap
      steps={steps}
      mode={mode}
      selectedSteps={selectedSteps}
      activeStepIndex={activeStepIndex}
      confirmedSteps={confirmedSteps}
      isConfirming={isConfirming}
      stats={stats}
      onToggleStep={toggleStep}
      onSelectAll={selectAll}
      onDeselectAll={deselectAll}
      onConfirm={confirmPath}
      onNavigateToStep={navigateToStep}
      onReEnableStep={reEnableStep}
    />
  );

  // Stage Panel Component
  const stagePanel = (
    <StagePanel
      mode={mode}
      currentStep={currentStep}
      confirmedSteps={confirmedSteps}
      activeStepIndex={activeStepIndex}
      discipline={discipline}
      syllabusUrls={syllabusUrls}
      stats={stats}
      rawSources={rawSources}
      getDomainShortName={getDomainShortName}
      extractCourseCode={extractCourseCode}
      getSourceColorByUrl={getSourceColorByUrl}
    />
  );

  // Mobile Layout: Use Sheet for Metro Map
  if (isMobile) {
    return (
      <div className="relative w-full min-h-[70dvh]">
        {/* Floating Map Button - TOP LEFT */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="sm"
              className="fixed top-20 left-4 shadow-lg z-50"
            >
              <Map className="h-4 w-4 mr-2" />
              {mode === 'draft' ? t('learning.map') : `${(activeStepIndex ?? 0) + 1}/${confirmedSteps.length}`}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-[350px] p-0">
            {metroMap}
          </SheetContent>
        </Sheet>

        {/* Stage Panel - Full Width */}
        <div className="w-full border rounded-lg overflow-hidden bg-card">
          {stagePanel}
        </div>
      </div>
    );
  }

  // Desktop Layout: Collapsible Sidebar
  return (
    <div className="h-[calc(100vh-120px)] min-h-[700px] border rounded-lg overflow-hidden bg-card flex">
      {/* Left Panel - Collapsible Metro Map */}
      <div 
        className={cn(
          "h-full border-r transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0",
          isCollapsed ? "w-0" : "w-[320px]"
        )}
      >
        <div className="h-full w-[320px]">
          {metroMap}
        </div>
      </div>

      {/* Right Panel - Stage (expands when collapsed) */}
      <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col">
        {/* Toggle Button */}
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="gap-2"
          >
            {isCollapsed ? (
              <>
                <PanelLeft className="h-4 w-4" />
                <span className="text-xs">{t('learning.showMap')}</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span className="text-xs">{t('learning.hideMap')}</span>
              </>
            )}
          </Button>
          {isCollapsed && mode === 'active' && (
            <span className="text-xs text-muted-foreground">
              {t('learning.stepOf', { current: (activeStepIndex ?? 0) + 1, total: confirmedSteps.length })}
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden w-full max-w-full">
          {stagePanel}
        </div>
      </div>
    </div>
  );
}
