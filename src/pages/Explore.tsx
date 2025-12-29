import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ExploreContainer } from "@/components/explore";
import { SearchResults } from "@/components/SearchResults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SmartPreGenerationSettings, SmartPreGenerationConstraints, toLegacyConstraints } from "@/components/SmartPreGenerationSettings";
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
  match_type?: 'exact' | 'fuzzy' | 'prefix' | 'ai';
  similarity_score?: number;
  rationale?: string;
}

const Explore = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState<Discipline[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSearch, setShowSearch] = useState(!!searchParams.get("q"));
  const [contextPath, setContextPath] = useState<string[] | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalConstraints, setGlobalConstraints] = useState<SmartPreGenerationConstraints>({
    skillLevel: 'beginner',
    hoursPerWeek: 5,
    durationWeeks: 4,
    depth: 'standard'
  });

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query);
      setShowSearch(true);
    }
  }, [searchParams]);

  // Automated 3-step cascade: DB fuzzy → AI catalog → auto ad-hoc redirect
  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(false);
    try {
      const searchTerm = query.toLowerCase().trim();
      // Use lower threshold for short queries (morphological variants like bible→biblical)
      const threshold = searchTerm.length <= 6 ? 0.2 : 0.25;

      // Step 1: Try DB fuzzy search (includes exact, prefix, and fuzzy matches)
      const { data: fuzzyData, error: fuzzyError } = await supabase.rpc('search_disciplines_fuzzy', {
        search_term: searchTerm,
        similarity_threshold: threshold,
      });

      if (!fuzzyError && fuzzyData && fuzzyData.length > 0) {
        const resultsWithType = fuzzyData.map((d: any) => ({
          ...d,
          match_type: d.match_type as 'exact' | 'fuzzy' | 'prefix',
          similarity_score: d.similarity_score,
        }));
        setSearchResults(resultsWithType);
        return;
      }

      // If the RPC errored, do NOT jump to ad-hoc; fall back to a basic DB search.
      if (fuzzyError) {
        console.warn('DB fuzzy search errored; falling back to basic DB search:', fuzzyError);
        const { data, error } = await supabase
          .from('disciplines')
          .select('*')
          .or(
            `l1.ilike.%${searchTerm}%,l2.ilike.%${searchTerm}%,l3.ilike.%${searchTerm}%,l4.ilike.%${searchTerm}%,l5.ilike.%${searchTerm}%,l6.ilike.%${searchTerm}%`
          )
          .limit(50);

        if (!error && data && data.length > 0) {
          setSearchResults(data.map(d => ({ ...d, match_type: 'exact' as const, similarity_score: 1.0 })));
          return;
        }
      }

      // Step 2: DB found nothing → automatically try AI catalog matching
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-match-discipline', {
          body: { query: searchTerm, limit: 10 },
        });

        if (!aiError && aiData?.matches && aiData.matches.length > 0) {
          setSearchResults(aiData.matches);
          return;
        }
      } catch (aiErr) {
        console.error('AI catalog match failed:', aiErr);
      }

      // Step 3: AI catalog also found nothing → auto-redirect to ad-hoc generation
      const params = new URLSearchParams({
        discipline: query,
        isAdHoc: 'true',
        searchTerm: query,
        depth: globalConstraints.depth,
        hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
        skillLevel: globalConstraints.skillLevel,
      });
      if (globalConstraints.durationWeeks) {
        params.set('durationWeeks', globalConstraints.durationWeeks.toString());
      }
      navigate(`/syllabus?${params.toString()}`);
    } finally {
      setSearching(false);
      setHasSearched(true);
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
    globalConstraints.durationWeeks !== 4 || 
    globalConstraints.skillLevel !== 'beginner';
  
  // Convert smart constraints to legacy format for child components
  const legacyConstraints = toLegacyConstraints(globalConstraints);

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
                  <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 border rounded-lg p-6 bg-card">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    These settings will be applied to all syllabus generations. Depth is automatically determined based on your available time.
                  </p>
                </div>
                <SmartPreGenerationSettings 
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
              hasSearched={hasSearched}
              onBrowseInContext={handleBrowseInContext}
              globalConstraints={legacyConstraints}
            />
          ) : (
            <div>
              <h1 className="text-3xl font-serif font-bold mb-8">
                Browse Disciplines
              </h1>
              <ExploreContainer 
                initialPath={contextPath} 
                globalConstraints={legacyConstraints}
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