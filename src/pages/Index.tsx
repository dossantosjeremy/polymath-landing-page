import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { DiscoveryChips } from "@/components/DiscoveryChips";
import { TrendingTopics } from "@/components/TrendingTopics";
import { Footer } from "@/components/Footer";
import { DisciplineImporter } from "@/components/DisciplineImporter";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <DiscoveryChips />
        <TrendingTopics />
      </main>
      <Footer />
      {user && <DisciplineImporter />}
    </div>
  );
};

export default Index;
