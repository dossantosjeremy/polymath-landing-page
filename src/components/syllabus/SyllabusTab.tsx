import { SmartLearningPathSettings } from "@/components/SmartLearningPathSettings";
import { CurriculumAuditCard } from "@/components/CurriculumAuditCard";
import { AdHocHeader } from "@/components/AdHocHeader";
import { AIEnhancementProgress } from "@/components/AIEnhancementProgress";
import { ProvenanceBadge, ProvenanceDisclaimer, determineContentSource } from "@/components/ProvenanceBadge";
import { CustomFocusPills } from "@/components/CustomFocusPills";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, BookOpen, ShieldCheck, ChevronDown } from "lucide-react";
import { useSyllabusContext } from "./SyllabusContext";

export function SyllabusTab() {
  const {
    syllabusData,
    discipline,
    loading,
    aiStatus,
    showAIContent,
    handleEnhanceWithAI,
    handleAIViewToggle,
    learningSettings,
    pruningStats,
    handleApplyConstraints,
    applyingConstraints,
    useCache,
    originalSources,
    getDomainShortName,
    extractCourseCode,
    getSourceColorByUrl,
    selectedPillars,
    customPillars,
    togglePillar,
    addCustomPillar,
    removeCustomPillar,
    regenerateWithPillars,
    isApplyingPillars,
  } = useSyllabusContext();

  if (!syllabusData) return null;

  const contentSource = determineContentSource({
    fromCache: useCache,
    isAdHoc: syllabusData.isAdHoc,
    isAIEnhanced: aiStatus === 'ready' || syllabusData.isAIEnhanced,
    source: syllabusData.source
  });

  const showAIEnhancement = contentSource !== 'tier3_ai_generated' 
    && contentSource !== 'web_sourced';

  const sourcesToDisplay = originalSources.length > 0 ? originalSources : syllabusData.rawSources || [];
  
  // Compute sources actually used in the syllabus
  const usedSourceUrls = new Set<string>();
  syllabusData.modules.forEach(m => {
    if (m.sourceUrl) usedSourceUrls.add(m.sourceUrl);
    if (m.sourceUrls) m.sourceUrls.forEach(url => usedSourceUrls.add(url));
  });
  const usedSources = sourcesToDisplay.filter(source => usedSourceUrls.has(source.url));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Provenance Badge and AI Enhancement */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold mb-4">Content Source</h3>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <ProvenanceBadge source={contentSource} size="md" />
            {syllabusData.rawSources && syllabusData.rawSources.length > 0 && (
              <span className="text-sm text-muted-foreground">
                • {syllabusData.rawSources.length} source{syllabusData.rawSources.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {/* Progressive AI Enhancement UI */}
          {showAIEnhancement && (
            <div className="flex items-center gap-3">
              {aiStatus === 'idle' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnhanceWithAI}
                  disabled={loading}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span>Enhance with AI</span>
                </Button>
              ) : aiStatus === 'loading' ? (
                <AIEnhancementProgress discipline={discipline} />
              ) : (
                <Tabs 
                  value={showAIContent ? "enhanced" : "academic"} 
                  onValueChange={(val) => handleAIViewToggle(val === "enhanced")}
                  className="w-auto"
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="academic" className="text-sm px-3 gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Academic Only
                    </TabsTrigger>
                    <TabsTrigger value="enhanced" className="text-sm px-3 gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Enhanced
                      {(() => {
                        const aiCount = syllabusData.modules.filter(m => m.isAIDiscovered).length;
                        if (aiCount === 0) return null;
                        return <span className="ml-1 text-xs opacity-70">+{aiCount}</span>;
                      })()}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          )}
        </div>
        
        <ProvenanceDisclaimer source={contentSource} className="mt-4" />
      </div>

      {/* Topic Focus Pills - always show for ad-hoc/AI-enhanced syllabi to allow customization */}
      {(syllabusData.isAdHoc || syllabusData.isAIEnhanced || 
        (syllabusData.topicPillars && syllabusData.topicPillars.length > 0) || 
        customPillars.length > 0) ? (
        <CustomFocusPills
          pillars={syllabusData.topicPillars || []}
          selectedPillars={selectedPillars}
          customPillars={customPillars}
          onTogglePillar={togglePillar}
          onAddCustomPillar={addCustomPillar}
          onRemoveCustomPillar={removeCustomPillar}
          onApplyFocus={regenerateWithPillars}
          onResetToDefaults={() => {
            // Reset custom pillars
            customPillars.forEach(p => removeCustomPillar(p));
            // Reset to default: select core and important
            if (syllabusData.topicPillars) {
              const defaultSelected = new Set(
                syllabusData.topicPillars
                  .filter(p => p.priority === 'core' || p.priority === 'important')
                  .map(p => p.name)
              );
              // Toggle all off then toggle defaults on
              syllabusData.topicPillars.forEach(p => {
                if (selectedPillars.has(p.name) && !defaultSelected.has(p.name)) {
                  togglePillar(p.name);
                } else if (!selectedPillars.has(p.name) && defaultSelected.has(p.name)) {
                  togglePillar(p.name);
                }
              });
            }
          }}
          isApplying={isApplyingPillars}
        />
      ) : null}

      {/* Learning Path Settings */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold mb-4">Learning Path Configuration</h3>
        <SmartLearningPathSettings
          onGenerate={handleApplyConstraints}
          pruningStats={pruningStats || syllabusData.pruningStats}
          isGenerating={applyingConstraints}
          defaultOpen={true}
        />
      </div>

      {/* Ad-Hoc Generation Banner */}
      {showAIContent && (syllabusData.isAdHoc || syllabusData.isAIEnhanced) && (
        <AdHocHeader
          discipline={discipline}
          compositionType={syllabusData.compositionType}
          derivedFrom={syllabusData.derivedFrom}
          topicPillars={syllabusData.topicPillars}
          narrativeFlow={syllabusData.narrativeFlow}
          synthesisRationale={syllabusData.synthesisRationale}
          sourceCount={syllabusData.rawSources?.length || 0}
          sourceNames={(syllabusData.rawSources || []).map(s => getDomainShortName(s.url)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5)}
          discoveredAuthorities={syllabusData.discoveredAuthorities}
        />
      )}

      {/* Optimization Report */}
      {usedSources.length > 0 && (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <button className="w-full border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Optimization Report</h3>
                <span className="text-sm text-muted-foreground">
                  ({usedSources.length} sources)
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CurriculumAuditCard
              rawSources={usedSources}
              pruningStats={pruningStats || syllabusData.pruningStats}
              onRestoreAll={() => handleApplyConstraints({ 
                depth: 'detailed',
                hoursPerWeek: learningSettings.hoursPerWeek,
                skillLevel: learningSettings.skillLevel
              })}
              getDomainShortName={getDomainShortName}
              extractCourseCode={extractCourseCode}
              getSourceColorByUrl={getSourceColorByUrl}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
