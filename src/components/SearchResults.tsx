import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommuniySyllabus } from "@/hooks/useCommuniySyllabus";

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
}

export const SearchResults = ({ results, query, searching, onBrowseInContext }: SearchResultsProps) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Check cache for expanded discipline
  const expandedDiscipline = results.find(r => r.id === expandedId);
  const expandedDisciplineName = expandedDiscipline ? getLastLevel(expandedDiscipline) : '';
  const { cachedSyllabus, cacheDate, sourceCount } = useCommuniySyllabus(expandedDisciplineName);
  
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

  const handleGenerateSyllabus = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    navigate(`/syllabus?discipline=${encodeURIComponent(disciplineName)}&path=${encodeURIComponent(path)}`);
  };

  const handleLoadCachedSyllabus = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    navigate(`/syllabus?useCache=true&discipline=${encodeURIComponent(disciplineName)}&path=${encodeURIComponent(path)}`);
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
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No results found for "{query}"
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try searching with different keywords
        </p>
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
        {results.map((discipline) => {
          const path = getDisciplinePath(discipline);
          const level = getLevel(discipline);

          const isExpanded = expandedId === discipline.id;
          
          return (
            <Card 
              key={discipline.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : discipline.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-accent text-accent-foreground rounded-full">
                        {level}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap text-sm mb-2">
                      {path.map((segment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className={index === path.length - 1 ? "font-semibold" : "text-muted-foreground"}>
                            {segment}
                          </span>
                          {index < path.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>

                    {isExpanded && (
                      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        {cachedSyllabus ? (
                          <>
                            <div className="flex-1">
                              <Button
                                onClick={() => handleLoadCachedSyllabus(discipline)}
                                className="w-full mb-2"
                              >
                                Load Cached Syllabus
                              </Button>
                              {cacheDate && (
                                <p className="text-xs text-muted-foreground text-center">
                                  Cached {cacheDate} • {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleGenerateSyllabus(discipline)}
                              variant="outline"
                              className="flex-1"
                            >
                              Generate Fresh
                            </Button>
                            <Button
                              onClick={() => onBrowseInContext(discipline)}
                              variant="outline"
                              className="flex-1"
                            >
                              Browse in Context
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleGenerateSyllabus(discipline)}
                              className="flex-1"
                            >
                              Generate Syllabus
                            </Button>
                            <Button
                              onClick={() => onBrowseInContext(discipline)}
                              variant="outline"
                              className="flex-1"
                            >
                              Browse in Context
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
