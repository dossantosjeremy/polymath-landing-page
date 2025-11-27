import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Project Hermes</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            className="rounded-full px-6 font-medium"
          >
            Sign Up
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-full px-6 font-medium"
          >
            Log In
          </Button>
        </div>
      </div>
    </nav>
  );
};
