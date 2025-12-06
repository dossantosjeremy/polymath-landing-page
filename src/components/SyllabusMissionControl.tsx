
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CurriculumMetroMap } from "@/components/CurriculumMetroMap";
import { StagePanel } from "@/components/StagePanel";
import { useMissionControl, MissionControlStep } from "@/hooks/useMissionControl";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Map } from "lucide-react";

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
}

export function SyllabusMissionControl({
  modules,
  discipline,
  rawSources = [],
  onConfirm,
  getDomainShortName,
  extractCourseCode,
  getSourceColorByUrl,
}: SyllabusMissionControlProps) {
  const isMobile = useIsMobile();

  // Transform modules to MissionControlStep format
  const steps: MissionControlStep[] = modules
    .filter(m => !m.isHiddenForTime && !m.isHiddenForDepth)
    .map((module, idx) => ({
      ...module,
      originalIndex: idx,
    }));

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
  } = useMissionControl({ steps, onConfirm });

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
      <div className="relative h-[calc(100vh-200px)] min-h-[500px]">
        {/* Stage Panel - Full Width */}
        <div className="h-full border rounded-lg overflow-hidden bg-card">
          {stagePanel}
        </div>

        {/* Floating Map Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-6 right-6 shadow-lg z-50"
            >
              <Map className="h-5 w-5 mr-2" />
              {mode === 'draft' ? 'View Map' : `${(activeStepIndex ?? 0) + 1}/${confirmedSteps.length}`}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0">
            {metroMap}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop Layout: Split-Screen with Resizable Panels
  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] border rounded-lg overflow-hidden bg-card">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Metro Map (30%) */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full border-r">
            {metroMap}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Stage (70%) */}
        <ResizablePanel defaultSize={70}>
          <div className="h-full">
            {stagePanel}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
