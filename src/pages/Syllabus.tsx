import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, ChevronRight, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  isCapstone?: boolean;
}

interface SyllabusData {
  discipline: string;
  modules: Module[];
  source: string;
  timestamp: string;
}

const Syllabus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const discipline = searchParams.get("discipline") || "";
  const path = searchParams.get("path") || "";

  useEffect(() => {
    if (discipline) {
      generateSyllabus();
    }
  }, [discipline]);

  const generateSyllabus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-syllabus', {
        body: { discipline }
      });

      if (error) throw error;

      setSyllabusData(data);
    } catch (error) {
      console.error('Error generating syllabus:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate syllabus. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (index: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedModules(newExpanded);
  };

  const pathArray = path ? path.split(' > ') : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button
              onClick={() => navigate('/')}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => navigate('/explore')}
              className="hover:text-foreground transition-colors"
            >
              Explore
            </button>
            {pathArray.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <span>{segment}</span>
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold mb-2">{discipline}</h1>
            <p className="text-lg text-muted-foreground">Course Syllabus Blueprint</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Generating comprehensive syllabus...</p>
                <p className="text-sm text-muted-foreground">Searching MIT, Yale, Harvard, and online courses</p>
              </div>
            </div>
          ) : syllabusData ? (
            <div className="space-y-6">
              {/* Source Banner */}
              <div className="bg-accent/30 border border-accent rounded-lg p-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Curriculum Source</h3>
                  <p className="text-sm text-muted-foreground mb-2">{syllabusData.source}</p>
                  {syllabusData.modules[0]?.sourceUrl && (
                    <a
                      href={syllabusData.modules[0].sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View Original Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Capstone Thread Explanation */}
              <div className="bg-muted/50 border rounded-lg p-4">
                <h3 className="font-semibold mb-2">About This Syllabus</h3>
                <p className="text-sm text-muted-foreground">
                  This course structure integrates project-based learning with theoretical foundations. 
                  Capstone checkpoints are woven throughout to ensure progressive skill building.
                </p>
              </div>

              {/* Modules List */}
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold mb-4">Course Modules</h2>
                {syllabusData.modules.map((module, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-all",
                      module.isCapstone && "bg-accent/10 border-accent"
                    )}
                  >
                    <button
                      onClick={() => toggleModule(index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{module.title}</h3>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            module.isCapstone 
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {module.tag}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Source: {module.source}</span>
                          {module.sourceUrl && (
                            <a
                              href={module.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        expandedModules.has(index) && "rotate-90"
                      )} />
                    </button>
                    
                    {expandedModules.has(index) && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="pt-4 text-sm text-muted-foreground">
                          {module.isCapstone ? (
                            <p>This is a project milestone where you'll apply what you've learned to your capstone project.</p>
                          ) : (
                            <p>Detailed content and resources will be populated after you approve this structure.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="sticky bottom-6 pt-6">
                <Button size="lg" className="w-full" onClick={() => {
                  toast({
                    title: "Feature Coming Soon",
                    description: "Resource population will be implemented next!"
                  });
                }}>
                  Approve Structure & Generate Resources
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  We'll search 10,000+ sources to find the best videos and materials for these topics
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Syllabus;
