import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ProgressiveDisclosure } from "@/components/ProgressiveDisclosure";
import { SearchResults } from "@/components/SearchResults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PreGenerationSettings, PreGenerationConstraints } from "@/components/PreGenerationSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Discipline {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
}

const Explore = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState<Discipline[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(!!searchParams.get("q"));
  const [contextPath, setContextPath] = useState<string[] | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalConstraints, setGlobalConstraints] = useState<PreGenerationConstraints>({
    depth: 'standard',
    hoursPerWeek: 5,
    skillLevel: 'beginner'
  });

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query);
      setShowSearch(true);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const searchTerm = query.toLowerCase();
      
      const { data, error } = await supabase
        .from("disciplines")
        .select("*")
        .or(`l1.ilike.%${searchTerm}%,l2.ilike.%${searchTerm}%,l3.ilike.%${searchTerm}%,l4.ilike.%${searchTerm}%,l5.ilike.%${searchTerm}%,l6.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) {
        console.error("Search error:", error);
        return;
      }

      setSearchResults(data || []);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(true);
    }
  };

  const getDisciplinePath = (discipline: Discipline): string[] => {
    const path = [discipline.l1];
    if (discipline.l2) path.push(discipline.l2);
    if (discipline.l3) path.push(discipline.l3);
    if (discipline.l4) path.push(discipline.l4);
    if (discipline.l5) path.push(discipline.l5);
    if (discipline.l6) path.push(discipline.l6);
    return path;
  };

  const handleBrowseInContext = (discipline: Discipline) => {
    const path = getDisciplinePath(discipline);
    setContextPath(path);
    setSearchQuery("");
    setShowSearch(false);
    navigate("/explore");
  };

  const isCustomSettings = globalConstraints.depth !== 'standard' || 
    globalConstraints.hoursPerWeek !== 5 || 
    globalConstraints.goalDate || 
    globalConstraints.skillLevel !== 'beginner';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search Bar */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search disciplines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 h-14 text-base rounded-full border-2"
                />
                <Button 
                  type="submit"
                  className="absolute right-1 h-12 px-8 rounded-full font-medium"
                  disabled={searching}
                >
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
            </form>
          </div>

          {/* Persistent Global Settings Bar (Option 3) */}
          <div className="mb-6 max-w-4xl mx-auto">
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Default Learning Path Settings</span>
                    {isCustomSettings && <Badge variant="secondary">Custom</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {settingsOpen ? "Hide" : "Show"} settings
                  </span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 border p-6 bg-card">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    These settings will be applied to all syllabus generations on this page. You can still customize per discipline.
                  </p>
                </div>
                <PreGenerationSettings 
                  constraints={globalConstraints}
                  onChange={setGlobalConstraints}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Results or Browse */}
          {showSearch && searchQuery ? (
            <SearchResults 
              results={searchResults} 
              query={searchQuery}
              searching={searching}
              onBrowseInContext={handleBrowseInContext}
              globalConstraints={globalConstraints}
            />
          ) : (
            <div>
              <h1 className="text-3xl font-serif font-bold mb-6">
                Browse Disciplines
              </h1>
              <ProgressiveDisclosure 
                initialPath={contextPath} 
                globalConstraints={globalConstraints}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
