import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { DiscoveryChips } from "@/components/DiscoveryChips";
import { TrendingTopics } from "@/components/TrendingTopics";
import { Footer } from "@/components/Footer";

const Index = () => {
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
