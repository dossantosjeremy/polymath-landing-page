import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ProgressiveDisclosure } from "@/components/ProgressiveDisclosure";
import { SearchResults } from "@/components/SearchResults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

          {/* Results or Browse */}
          {showSearch && searchQuery ? (
            <SearchResults 
              results={searchResults} 
              query={searchQuery}
              searching={searching}
            />
          ) : (
            <div>
              <h1 className="text-3xl font-serif font-bold mb-6">
                Browse Disciplines
              </h1>
              <ProgressiveDisclosure />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
