import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdHocGenerationCardProps {
  searchTerm: string;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export const AdHocGenerationCard = ({ searchTerm, onGenerate, isGenerating }: AdHocGenerationCardProps) => {
  return (
    <Card className="border-2 border-dashed border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[hsl(var(--gold))]" />
          <CardTitle className="text-xl">"{searchTerm}" Not in Academic Database</CardTitle>
        </div>
        <CardDescription className="text-base">
          But we can still build you a curriculum! Project Hermes will search the web 
          for syllabi, courses, and learning paths from universities, bootcamps, and industry experts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onGenerate} 
          className="w-full"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
              Generating Custom Syllabus...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Custom Syllabus for "{searchTerm}"
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          This will search authoritative sources outside our curated academic database
        </p>
      </CardContent>
    </Card>
  );
};
