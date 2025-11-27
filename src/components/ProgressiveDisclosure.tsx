import { useState, useEffect, useRef } from "react";
import { ChevronRight, Check, ScrollText, FlaskConical, Globe, Palette, Code2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

const getDomainIcon = (domain: string) => {
  const iconMap: Record<string, any> = {
    "Humanities": ScrollText,
    "Natural Sciences": FlaskConical,
    "Social Sciences": Globe,
    "Arts": Palette,
    "Computer Science": Code2,
    "Business": BarChart3,
  };
  return iconMap[domain] || ScrollText;
};

interface DisciplineLevel {
  value: string;
  count: number;
}

interface ProgressiveDisclosureProps {
  initialPath?: string[];
}

export const ProgressiveDisclosure = ({ initialPath }: ProgressiveDisclosureProps = {}) => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<DisciplineLevel[][]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const hasExpandedRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    loadLevel1();
  }, []);

  useEffect(() => {
    const pathKey = initialPath?.join('/') || null;
    
    // Only expand if:
    // - We have an initialPath
    // - Levels are loaded
    // - We haven't already expanded to this exact path
    if (initialPath && initialPath.length > 0 && levels.length > 0 && hasExpandedRef.current !== pathKey) {
      hasExpandedRef.current = pathKey;
      expandToPath(initialPath);
    }
  }, [initialPath, levels.length]);

  const handleSelectDiscipline = () => {
    if (selectedPath.length === 0) return;
    
    const fullPath = selectedPath.join(' > ');
    const lastLevel = selectedPath[selectedPath.length - 1];
    
    navigate(`/syllabus?discipline=${encodeURIComponent(lastLevel)}&path=${encodeURIComponent(fullPath)}`);
  };

  const loadLevel1 = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("l1")
        .not("l1", "is", null);

      if (error) throw error;

      // Count occurrences and get unique values
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.l1] = (counts[item.l1] || 0) + 1;
      });

      const uniqueL1 = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      setLevels([uniqueL1]);
    } catch (error) {
      console.error("Error loading L1:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextLevel = async (levelIndex: number, parentValue: string) => {
    setLoading(true);
    
    // Update selected path
    const newPath = selectedPath.slice(0, levelIndex);
    newPath.push(parentValue);
    setSelectedPath(newPath);

    // Remove levels after current
    const newLevels = levels.slice(0, levelIndex + 1);

    try {
      const levelKey = `l${levelIndex + 2}` as 'l2' | 'l3' | 'l4' | 'l5' | 'l6';
      
      // Build query based on selected path
      let query = supabase
        .from("disciplines")
        .select(levelKey)
        .not(levelKey, "is", null)
        .eq("l1", newPath[0]);

      // Add filters for each level in the path
      if (newPath[1] && levelIndex >= 1) query = query.eq("l2", newPath[1]);
      if (newPath[2] && levelIndex >= 2) query = query.eq("l3", newPath[2]);
      if (newPath[3] && levelIndex >= 3) query = query.eq("l4", newPath[3]);
      if (newPath[4] && levelIndex >= 4) query = query.eq("l5", newPath[4]);

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Count occurrences
        const counts: Record<string, number> = {};
        data.forEach((item) => {
          const value = item[levelKey];
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });

        const nextLevel = Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value));

        if (nextLevel.length > 0) {
          newLevels.push(nextLevel);
        }
      }

      setLevels(newLevels);
    } catch (error) {
      console.error("Error loading next level:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollSelectedItemsIntoView = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        columnRefs.current.forEach((columnEl, index) => {
          if (columnEl && selectedPath[index]) {
            const selectedButton = columnEl.querySelector('[data-selected="true"]');
            if (selectedButton) {
              selectedButton.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }
        });
      }, 100);
    });
  };

  const expandToPath = async (path: string[]) => {
    setSelectedPath(path);
    const newLevels = [levels[0]];

    for (let i = 0; i < path.length - 1; i++) {
      const levelKey = `l${i + 2}` as 'l2' | 'l3' | 'l4' | 'l5' | 'l6';
      
      let query = supabase
        .from("disciplines")
        .select(levelKey)
        .not(levelKey, "is", null)
        .eq("l1", path[0]);

      if (path[1] && i >= 1) query = query.eq("l2", path[1]);
      if (path[2] && i >= 2) query = query.eq("l3", path[2]);
      if (path[3] && i >= 3) query = query.eq("l4", path[3]);
      if (path[4] && i >= 4) query = query.eq("l5", path[4]);

      const { data, error } = await query;

      if (error) {
        console.error("Error expanding path:", error);
        break;
      }

      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        data.forEach((item) => {
          const value = item[levelKey];
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });

        const nextLevel = Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value));

        if (nextLevel.length > 0) {
          newLevels.push(nextLevel);
        }
      }
    }

    setLevels(newLevels);
    
    // Auto-scroll to the rightmost column after expansion
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          container.scrollTo({
            left: container.scrollWidth - container.clientWidth,
            behavior: 'smooth'
          });
        }
        // Scroll selected items into view in each column
        scrollSelectedItemsIntoView();
      }, 250);
    });
  };

  if (loading && levels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPath.length > 0 && (
        <div className="flex items-center justify-between bg-accent/20 border border-accent rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Selected discipline:</p>
            <p className="font-semibold">{selectedPath.join(' > ')}</p>
          </div>
          <Button onClick={handleSelectDiscipline} className="gap-2">
            <Check className="h-4 w-4" />
            Generate Syllabus
          </Button>
        </div>
      )}
      
      <div className="border overflow-hidden h-[600px]">
        <div ref={scrollContainerRef} className="flex gap-0 overflow-x-auto h-full scroll-smooth">
        {levels.map((levelData, levelIndex) => (
          <div
            key={levelIndex}
            className="flex-shrink-0 border-r border-border last:border-r-0 flex flex-col h-full"
            style={{ minWidth: '250px', maxWidth: '250px' }}
          >
            <div className="px-4 py-3 bg-muted font-medium text-sm border-b border-border flex-shrink-0">
              {levelIndex === 0 ? "Domain" : `Level ${levelIndex + 1}`}
            </div>
            <div 
              ref={(el) => { columnRefs.current[levelIndex] = el; }}
              className="divide-y divide-border overflow-y-auto flex-1"
            >
              {levelData.map((item) => {
                const isSelected = selectedPath[levelIndex] === item.value;
                const hasMore = levelIndex < 5; // Can expand up to level 6
                const DomainIcon = levelIndex === 0 ? getDomainIcon(item.value) : null;
                return (
                  <button
                    key={item.value}
                    data-selected={isSelected}
                    onClick={() => loadNextLevel(levelIndex, item.value)}
                    disabled={!hasMore}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between group",
                      isSelected && "bg-accent/50 font-medium",
                      !hasMore && "cursor-default"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {DomainIcon && <DomainIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                      <span className="text-sm truncate">{item.value}</span>
                    </div>
                    {hasMore && (
                      <ChevronRight className={cn(
                        "h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors",
                        isSelected && "text-foreground"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};
