import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { DiscoveryChips } from "@/components/DiscoveryChips";
import { TrendingTopics } from "@/components/TrendingTopics";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize disciplines data on first load
    const initializeDisciplines = async () => {
      try {
        // Check if disciplines exist
        const { count } = await supabase
          .from('disciplines')
          .select('*', { count: 'exact', head: true });

        if (!count || count === 0) {
          // Call the import function
          const { error } = await supabase.functions.invoke('import-disciplines');
          
          if (error) {
            console.error('Failed to import disciplines:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing disciplines:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDisciplines();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading disciplines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <DiscoveryChips />
        <TrendingTopics />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
