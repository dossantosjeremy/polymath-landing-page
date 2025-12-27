import { SyllabusMissionControl } from "@/components/SyllabusMissionControl";
import { useSyllabusContext } from "./SyllabusContext";
import { useToast } from "@/hooks/use-toast";

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
  } = useSyllabusContext();

  if (!syllabusData) return null;

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
      />
    </div>
  );
}
