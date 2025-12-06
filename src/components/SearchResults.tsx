import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommuniySyllabus } from "@/hooks/useCommuniySyllabus";
import { PreGenerationConstraints } from "@/components/PreGenerationSettings";
import { AdHocGenerationCard } from "@/components/AdHocGenerationCard";
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

  const handleGenerateSyllabus = (discipline: Discipline, useAIEnhanced: boolean = false) => {
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
    
    // Pass AI-enhanced flag if true
    if (useAIEnhanced) {
      params.set('useAIEnhanced', 'true');
    }
    
    // Check if cached version exists - if so, add useCache parameter (only for traditional)
    if (cachedSyllabus && !useAIEnhanced) {
      params.set('useCache', 'true');
    }
    
    navigate(`/syllabus?${params.toString()}`);
  };
  const handleLoadCachedSyllabus = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    navigate(`/syllabus?useCache=true&discipline=${encodeURIComponent(disciplineName)}&path=${encodeURIComponent(path)}`);
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
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
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
  return <div>
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
        return <Card key={discipline.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : discipline.id)}>
              <CardContent className="pt-6 rounded-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-accent text-accent-foreground rounded-full">
                        {level}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap text-sm mb-2">
                      {path.map((segment, index) => <div key={index} className="flex items-center gap-2">
                          <span className={index === path.length - 1 ? "font-semibold" : "text-muted-foreground"}>
                            {segment}
                          </span>
                          {index < path.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>)}
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${isExpanded ? 'rotate-180' : ''}`} />

                    {isExpanded && <div className="flex flex-col gap-3 mt-4" onClick={e => e.stopPropagation()}>
                        {cachedSyllabus ? <>
                            <div>
                              <Button onClick={() => handleLoadCachedSyllabus(discipline)} className="w-full">
                                Load Cached Syllabus
                              </Button>
                              {cacheDate && <p className="text-xs text-muted-foreground text-center mt-1">
                                  Cached {cacheDate} • {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                                </p>}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Generate Fresh:</p>
                              <div className="flex gap-2">
                                <Button onClick={() => handleGenerateSyllabus(discipline, false)} variant="outline" className="flex-1">
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Traditional
                                </Button>
                                <Button onClick={() => handleGenerateSyllabus(discipline, true)} variant="outline" className="flex-1 border-purple-500/30 hover:bg-purple-500/10">
                                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                  AI-Enhanced
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center mt-1">
                                Traditional: Academic sources • AI-Enhanced: + Industry authorities
                              </p>
                            </div>
                            <Button onClick={() => onBrowseInContext(discipline)} variant="ghost" size="sm">
                              Browse in Context
                            </Button>
                          </> : <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Choose generation method:</p>
                              <div className="flex gap-2">
                                <Button onClick={() => handleGenerateSyllabus(discipline, false)} variant="outline" className="flex-1">
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Traditional
                                </Button>
                                <Button onClick={() => handleGenerateSyllabus(discipline, true)} className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  AI-Enhanced
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center mt-1">
                                Traditional: MIT, Yale, Coursera • AI-Enhanced: + Industry authorities
                              </p>
                            </div>
                            <Button onClick={() => onBrowseInContext(discipline)} variant="ghost" size="sm">
                              Browse in Context
                            </Button>
                          </>}
                      </div>}
                </div>
              </CardContent>
            </Card>;
      })}
      </div>
    </div>;
};