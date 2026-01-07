import { SyllabusMissionControl } from "@/components/SyllabusMissionControl";
import { useSyllabusContext } from "./SyllabusContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Lock, Library, ArrowRight } from "lucide-react";

export function ContentTab() {
  const { toast } = useToast();
  const {
    syllabusData,
    discipline,
    originalSources,
    showAIContent,
    getDomainShortName,
    extractCourseCode,
    getSourceColorByUrl,
    regenerationKey,
    missionControlState,
    setMissionControlState,
    startBackgroundLoading,
    sourcesConfirmed,
  } = useSyllabusContext();

  if (!syllabusData) return null;

  // Hard gate: content locked until sources confirmed
  if (!sourcesConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Content Locked</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Please review and confirm your curriculum sources before accessing learning content. 
          This ensures your learning path is built on verified, authoritative foundations.
        </p>
        <Button className="gap-2">
          <Library className="h-4 w-4" />
          Go to Sources
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SyllabusMissionControl
        key={`mission-control-${regenerationKey}-${showAIContent}`}
        modules={syllabusData.modules.filter(m => showAIContent || !m.isAIDiscovered)}
        discipline={discipline}
        rawSources={originalSources.length > 0 ? originalSources : syllabusData.rawSources}
        onConfirm={async (selectedIndices) => {
          toast({
            title: "Path Confirmed",
            description: `Your personalized learning path with ${selectedIndices.length} steps is ready.`,
          });
        }}
        getDomainShortName={getDomainShortName}
        extractCourseCode={extractCourseCode}
        getSourceColorByUrl={getSourceColorByUrl}
        regenerationKey={regenerationKey}
        aiEnabled={showAIContent}
        initialPersistedState={missionControlState}
        onStateChange={setMissionControlState}
        onPathConfirmed={startBackgroundLoading}
      />
    </div>
  );
}
