import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Hero = () => {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 md:py-32">
      <div className="text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight">
          What do you want to master today?
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A platform for self-directed learners focusing on project-based learning and creating written artifacts.
        </p>

        <div className="max-w-2xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="e.g. Philosophy, Python, Game Theory..."
              className="pl-12 pr-32 h-14 text-base rounded-full border-2"
            />
            <Button 
              className="absolute right-1 h-12 px-8 rounded-full font-medium"
              size="lg"
            >
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
