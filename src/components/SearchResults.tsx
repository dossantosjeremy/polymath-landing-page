import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, Sparkles, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCommuniySyllabus } from "@/hooks/useCommuniySyllabus";
import { PreGenerationConstraints } from "@/components/PreGenerationSettings";
import { AdHocGenerationCard } from "@/components/AdHocGenerationCard";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";

interface Discipline {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
}

interface SearchResultsProps {
  results: Discipline[];
  query: string;
  searching: boolean;
  onBrowseInContext: (discipline: Discipline) => void;
  globalConstraints: PreGenerationConstraints;
}

export const SearchResults = ({
  results,
  query,
  searching,
  onBrowseInContext,
  globalConstraints
}: SearchResultsProps) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingAdHoc, setGeneratingAdHoc] = useState(false);
  const [includeAIAugmentation, setIncludeAIAugmentation] = useState(false);

  // Check cache for expanded discipline
  const expandedDiscipline = results.find(r => r.id === expandedId);
  const expandedDisciplineName = expandedDiscipline ? getLastLevel(expandedDiscipline) : '';
  const {
    cachedSyllabus,
    cacheDate,
    sourceCount
  } = useCommuniySyllabus(expandedDisciplineName);

  const getDisciplinePath = (discipline: Discipline): string[] => {
    const path = [discipline.l1];
    if (discipline.l2) path.push(discipline.l2);
    if (discipline.l3) path.push(discipline.l3);
    if (discipline.l4) path.push(discipline.l4);
    if (discipline.l5) path.push(discipline.l5);
    if (discipline.l6) path.push(discipline.l6);
    return path;
  };

  const getLevel = (discipline: Discipline): string => {
    if (discipline.l6) return "Level 6";
    if (discipline.l5) return "Level 5";
    if (discipline.l4) return "Level 4";
    if (discipline.l3) return "Sub-domain";
    if (discipline.l2) return "Category";
    return "Domain";
  };

  function getLastLevel(discipline: Discipline): string {
    return discipline.l6 || discipline.l5 || discipline.l4 || discipline.l3 || discipline.l2 || discipline.l1;
  }

  const handleLoadSyllabus = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    const params = new URLSearchParams({
      discipline: disciplineName,
      path: path,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel
    });
    
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    
    // Database-first: If cached, load from cache unless AI augmentation is requested
    if (cachedSyllabus && !includeAIAugmentation) {
      params.set('useCache', 'true');
    }
    
    // Include AI augmentation if toggle is on
    if (includeAIAugmentation) {
      params.set('useAIEnhanced', 'true');
    }
    
    navigate(`/syllabus?${params.toString()}`);
  };

  const handleGenerateFresh = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    const params = new URLSearchParams({
      discipline: disciplineName,
      path: path,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel
    });
    
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    
    // Include AI augmentation if toggle is on
    if (includeAIAugmentation) {
      params.set('useAIEnhanced', 'true');
    }
    
    navigate(`/syllabus?${params.toString()}`);
  };

  const handleAdHocGeneration = () => {
    setGeneratingAdHoc(true);
    const params = new URLSearchParams({
      discipline: query,
      isAdHoc: 'true',
      searchTerm: query,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel
    });
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    navigate(`/syllabus?${params.toString()}`);
  };

  if (searching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <AdHocGenerationCard 
          searchTerm={query}
          onGenerate={handleAdHocGeneration}
          isGenerating={generatingAdHoc}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-2">
        Search Results
      </h2>
      <p className="text-muted-foreground mb-6">
        Found {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
      </p>

      <div className="grid gap-4">
        {results.map(discipline => {
          const path = getDisciplinePath(discipline);
          const level = getLevel(discipline);
          const isExpanded = expandedId === discipline.id;
          
          return (
            <Card 
              key={discipline.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group" 
              onClick={() => {
                setExpandedId(isExpanded ? null : discipline.id);
                setIncludeAIAugmentation(false); // Reset toggle when changing selection
              }}
            >
              <CardContent className="pt-6 rounded-sm">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-accent text-accent-foreground rounded-full">
                        {level}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      {path.map((segment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className={index === path.length - 1 ? "font-semibold" : "text-muted-foreground"}>
                            {segment}
                          </span>
                          {index < path.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-4 mt-4" onClick={e => e.stopPropagation()}>
                    {/* Database-first: Show provenance indicator */}
                    {cachedSyllabus && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <ProvenanceBadge source="database" size="sm" />
                        <span className="text-sm text-muted-foreground">
                          Cached {cacheDate} • {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Primary action: Load Academic Syllabus */}
                    <Button 
                      onClick={() => handleLoadSyllabus(discipline)} 
                      className="w-full"
                      size="lg"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      {cachedSyllabus ? 'Load Academic Syllabus' : 'Generate Academic Syllabus'}
                    </Button>

                    {/* AI Augmentation toggle */}
                    <label 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <Checkbox 
                        checked={includeAIAugmentation}
                        onCheckedChange={(checked) => setIncludeAIAugmentation(!!checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-500" />
                          <span className="font-medium text-sm">Include AI Augmentation</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Discover industry authorities and additional sources
                        </p>
                      </div>
                    </label>

                    {/* Secondary actions */}
                    <div className="flex gap-2">
                      {cachedSyllabus && (
                        <Button 
                          onClick={() => handleGenerateFresh(discipline)} 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          <BookOpen className="mr-2 h-3 w-3" />
                          Generate Fresh
                        </Button>
                      )}
                      <Button 
                        onClick={() => onBrowseInContext(discipline)} 
                        variant="ghost" 
                        size="sm"
                        className={cachedSyllabus ? 'flex-1' : 'w-full'}
                      >
                        Browse in Context
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};