import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
}

export const SearchResults = ({ results, query, searching }: SearchResultsProps) => {
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

          return (
            <Card key={discipline.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
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
                          {index < path.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
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
