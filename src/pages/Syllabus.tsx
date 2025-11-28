import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, ChevronRight, Home, ChevronDown, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  isCapstone?: boolean;
}

interface DiscoveredSource {
  institution: string;
  courseName: string;
  url: string;
  type: string;
  content?: string; // Full original syllabus text
  moduleCount?: number;
}

interface SyllabusData {
  discipline: string;
  modules: Module[];
  source: string;
  rawSources?: DiscoveredSource[];
  timestamp: string;
}

const Syllabus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [expandedSourceContent, setExpandedSourceContent] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [originalSources, setOriginalSources] = useState<DiscoveredSource[]>([]);

  const discipline = searchParams.get("discipline") || "";
  const path = searchParams.get("path") || "";
  const savedId = searchParams.get("savedId");

  useEffect(() => {
    if (savedId) {
      loadSavedSyllabus(savedId);
    } else if (discipline) {
      generateSyllabus();
    }
  }, [discipline, savedId]);

  // Initialize all sources as selected when syllabus data loads and store original sources
  useEffect(() => {
    if (syllabusData?.rawSources) {
      // Store original sources only on first load
      if (originalSources.length === 0) {
        setOriginalSources(syllabusData.rawSources);
      }
      setSelectedSources(new Set(syllabusData.rawSources.map((_, idx) => idx)));
    }
  }, [syllabusData?.rawSources]);

  // Helper function to extract domain short name from URL
  const getDomainShortName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const domainMap: Record<string, string> = {
        'ocw.mit.edu': 'MIT',
        'oyc.yale.edu': 'Yale',
        'coursera.org': 'Coursera',
        'edx.org': 'edX',
        'khanacademy.org': 'Khan',
        'oli.cmu.edu': 'CMU',
        'pll.harvard.edu': 'Harvard',
        'sjc.edu': 'St. John\'s',
        'uchicago.edu': 'UChicago',
        'hillsdale.edu': 'Hillsdale',
        'saylor.org': 'Saylor',
        'thedailyidea.org': 'Daily Idea',
        'gutenberg.org': 'Gutenberg',
        'archive.org': 'Archive',
        'opensyllabus.org': 'Open Syllabus',
        'open.edu': 'OpenLearn',
        'oercommons.org': 'OER Commons',
        'merlot.org': 'MERLOT',
        'openstax.org': 'OpenStax'
      };
      return domainMap[hostname] || hostname.split('.')[0].toUpperCase();
    } catch {
      return 'Source';
    }
  };

  // Helper function to get color for source type
  const getSourceColor = (type: string): string => {
    if (type === "University OCW") return "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]";
    if (type === "Great Books Program") return "bg-red-900/20 text-red-900 dark:text-red-300";
    if (type === "MOOC Platform") return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    if (type === "Philosophy Syllabi Collection") return "bg-purple-500/20 text-purple-700 dark:text-purple-300";
    if (type === "OER Repository") return "bg-green-500/20 text-green-700 dark:text-green-300";
    return "bg-muted text-muted-foreground";
  };

  // Helper function to parse and group modules by module number
  interface ModuleGroup {
    moduleNumber: number;
    moduleName: string;
    steps: Array<Module & { stepNumber: number; stepTitle: string; originalIndex: number }>;
  }

  const parseModuleGroups = (modules: Module[]): ModuleGroup[] => {
    const groups = new Map<number, ModuleGroup>();
    
    modules.forEach((module, originalIndex) => {
      // Parse "Module X - Step Y: Topic" format
      const match = module.title.match(/Module\s+(\d+)\s*-?\s*Step\s+(\d+):\s*(.+)/i);
      
      if (match) {
        const moduleNumber = parseInt(match[1]);
        const stepNumber = parseInt(match[2]);
        const stepTitle = match[3];
        
        if (!groups.has(moduleNumber)) {
          groups.set(moduleNumber, {
            moduleNumber,
            moduleName: `Module ${moduleNumber}`,
            steps: []
          });
        }
        
        groups.get(moduleNumber)!.steps.push({
          ...module,
          stepNumber,
          stepTitle,
          originalIndex
        });
      } else {
        // If it doesn't match the format, treat it as a standalone module
        const moduleNumber = groups.size + 1;
        groups.set(moduleNumber, {
          moduleNumber,
          moduleName: module.title,
          steps: [{
            ...module,
            stepNumber: 1,
            stepTitle: module.title,
            originalIndex
          }]
        });
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => a.moduleNumber - b.moduleNumber);
  };

  const loadSavedSyllabus = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_syllabi')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setSyllabusData({
        discipline: data.discipline,
        modules: data.modules as any as Module[],
        source: data.source,
        rawSources: data.raw_sources as any as DiscoveredSource[],
        timestamp: data.created_at
      });
      
      // Mark as already saved since it came from database
      setIsSaved(true);
      
      // Update URL to include path for breadcrumbs
      if (data.discipline_path) {
        searchParams.set('path', data.discipline_path);
        navigate(`/syllabus?${searchParams.toString()}`, { replace: true });
      }
    } catch (error) {
      console.error('Error loading saved syllabus:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load saved syllabus.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSyllabus = async (selectedSourceUrls?: string[]) => {
    const isRegenerating = !!selectedSourceUrls;
    if (isRegenerating) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-syllabus', {
        body: { 
          discipline,
          selectedSourceUrls 
        }
      });

      if (error) throw error;

      // Preserve original sources when regenerating
      setSyllabusData({
        ...data,
        rawSources: originalSources.length > 0 ? originalSources : data.rawSources
      });
      
      if (isRegenerating) {
        toast({
          title: "Syllabus Regenerated",
          description: `Generated from ${selectedSourceUrls?.length || 0} selected source(s).`,
        });
      }
    } catch (error) {
      console.error('Error generating syllabus:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate syllabus. Please try again.",
        variant: "destructive"
      });
    } finally {
      if (isRegenerating) {
        setRegenerating(false);
      } else {
        setLoading(false);
      }
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

  const toggleSourceContent = (index: number) => {
    const newExpanded = new Set(expandedSourceContent);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSourceContent(newExpanded);
  };

  const toggleSourceSelection = (index: number) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSources(newSelected);
  };

  const selectAllSources = () => {
    const sourcesToUse = originalSources.length > 0 ? originalSources : syllabusData?.rawSources;
    if (sourcesToUse) {
      setSelectedSources(new Set(sourcesToUse.map((_, idx) => idx)));
    }
  };

  const deselectAllSources = () => {
    setSelectedSources(new Set());
  };

  const regenerateWithSelectedSources = async () => {
    const sourcesToUse = originalSources.length > 0 ? originalSources : syllabusData?.rawSources;
    if (!sourcesToUse || selectedSources.size === 0) {
      toast({
        title: "No Sources Selected",
        description: "Please select at least one source to regenerate the syllabus.",
        variant: "destructive"
      });
      return;
    }

    const selectedUrls = Array.from(selectedSources)
      .map(idx => sourcesToUse[idx]?.url)
      .filter(Boolean) as string[];

    await generateSyllabus(selectedUrls);
  };

  const saveSyllabus = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to save syllabi for later.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!syllabusData) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('saved_syllabi').insert({
        user_id: user.id,
        discipline: syllabusData.discipline,
        discipline_path: path,
        modules: syllabusData.modules as any,
        source: syllabusData.source,
        source_url: syllabusData.modules[0]?.sourceUrl || null,
        raw_sources: (syllabusData.rawSources || []) as any
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Syllabus Saved",
        description: "You can access this syllabus anytime from your saved syllabi.",
      });
    } catch (error) {
      console.error('Error saving syllabus:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save syllabus. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const pathArray = path ? path.split(' > ') : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
            <button
              onClick={() => navigate('/')}
              className="hover:text-foreground hover:underline transition-colors flex items-center gap-1 text-primary"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => navigate('/explore')}
              className="hover:text-foreground hover:underline transition-colors text-primary"
            >
              Explore
            </button>
            {pathArray.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{segment}</span>
              </div>
            ))}
          </nav>

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-serif font-bold mb-2">{discipline}</h1>
              <p className="text-lg text-muted-foreground">Course Syllabus Blueprint</p>
            </div>
            {!loading && syllabusData && (
              <Button
                onClick={saveSyllabus}
                disabled={saving || isSaved}
                variant="outline"
                className="flex-shrink-0"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" />
                )}
                {isSaved ? 'Saved' : 'Save for Later'}
              </Button>
            )}
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
              {/* Source Pills Banner */}
              {(() => {
                const sourcesToDisplay = originalSources.length > 0 ? originalSources : syllabusData.rawSources || [];
                // Create unique domain pills
                const domainMap = new Map<string, DiscoveredSource>();
                sourcesToDisplay.forEach(source => {
                  const domain = getDomainShortName(source.url);
                  if (!domainMap.has(domain)) {
                    domainMap.set(domain, source);
                  }
                });
                const uniqueDomainSources = Array.from(domainMap.values());
                
                return (
                  <div className="bg-accent/30 border border-accent p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 bg-primary/10 flex items-center justify-center">
                        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Curriculum Sources</h3>
                      <div className="flex flex-wrap gap-2">
                        {uniqueDomainSources.map((source, idx) => {
                          const domainName = getDomainShortName(source.url);
                          return (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex items-center gap-1 px-3 py-1 text-sm font-medium transition-colors hover:opacity-80",
                                getSourceColor(source.type)
                              )}
                            >
                              {domainName}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Source Syllabi Section */}
              {((originalSources.length > 0) || (syllabusData.rawSources && syllabusData.rawSources.length > 0)) && (() => {
                const sourcesToDisplay = originalSources.length > 0 ? originalSources : syllabusData.rawSources || [];
                return (
                  <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Source Syllabi</h3>
                          <span className="text-sm text-muted-foreground">
                            ({sourcesToDisplay.length})
                          </span>
                        </div>
                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          sourcesOpen && "rotate-180"
                        )} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border border-t-0 p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedSources.size === sourcesToDisplay.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllSources();
                                } else {
                                  deselectAllSources();
                                }
                              }}
                            />
                            <span className="text-sm font-medium">
                              Select All ({selectedSources.size}/{sourcesToDisplay.length})
                            </span>
                          </div>
                        <Button
                          onClick={regenerateWithSelectedSources}
                          disabled={regenerating || selectedSources.size === 0}
                          size="sm"
                        >
                          {regenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            'Regenerate with Selected Sources'
                          )}
                        </Button>
                      </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select which sources to include in the syllabus generation:
                        </p>
                        <div className="space-y-3">
                          {sourcesToDisplay.map((source, idx) => (
                          <div key={idx} className="border bg-background">
                            <div className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedSources.has(idx)}
                                  onCheckedChange={() => toggleSourceSelection(idx)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{source.courseName}</span>
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 font-medium",
                                      source.type === "University OCW" && "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]",
                                      source.type === "Great Books Program" && "bg-red-900/20 text-red-900 dark:text-red-300",
                                      source.type === "MOOC Platform" && "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                                      source.type === "Philosophy Syllabi Collection" && "bg-purple-500/20 text-purple-700 dark:text-purple-300",
                                      source.type === "OER Repository" && "bg-green-500/20 text-green-700 dark:text-green-300",
                                      !["University OCW", "Great Books Program", "MOOC Platform", "Philosophy Syllabi Collection", "OER Repository"].includes(source.type) && "bg-muted text-muted-foreground"
                                    )}>
                                      {source.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{source.institution}</p>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all mt-1"
                                  >
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    {source.url}
                                  </a>
                                </div>
                              </div>
                            </div>
                            
                            {/* Embedded Content Section */}
                            <Collapsible 
                              open={expandedSourceContent.has(idx)} 
                              onOpenChange={() => toggleSourceContent(idx)}
                            >
                              <CollapsibleTrigger asChild>
                                <button className="w-full border-t p-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-sm">
                                  <span className="font-medium">View Original Syllabus Content</span>
                                  <ChevronDown className={cn(
                                    "h-4 w-4 text-muted-foreground transition-transform",
                                    expandedSourceContent.has(idx) && "rotate-180"
                                  )} />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t p-4 bg-muted/10 max-h-96 overflow-y-auto">
                                  {source.content ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                      <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono">
                                        {source.content}
                                      </pre>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">No Syllabus content could be identified.</p>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Module Sources (kept for backward compatibility) */}
              {(!syllabusData.rawSources || syllabusData.rawSources.length === 0) && (
                <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Raw Syllabus Sources</h3>
                        <span className="text-sm text-muted-foreground">
                          ({(() => {
                            const urls = new Set<string>();
                            syllabusData.modules.forEach(m => {
                              if (m.sourceUrl && !m.isCapstone) urls.add(m.sourceUrl);
                            });
                            return urls.size;
                          })()})
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        sourcesOpen && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border border-t-0 p-4 bg-muted/20">
                      <div className="space-y-2">
                        {(() => {
                          const urls = new Set<string>();
                          const sourcesList: { url: string; source: string }[] = [];
                          syllabusData.modules.forEach(m => {
                            if (m.sourceUrl && !m.isCapstone && !urls.has(m.sourceUrl)) {
                              urls.add(m.sourceUrl);
                              sourcesList.push({ url: m.sourceUrl, source: m.source });
                            }
                          });
                          return sourcesList.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                              <span className="text-sm font-mono text-muted-foreground min-w-[100px]">{item.source}</span>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 flex-1 truncate"
                              >
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                {item.url}
                              </a>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Capstone Thread Explanation */}
              <div className="bg-muted/50 border p-4">
                <h3 className="font-semibold mb-2">About This Syllabus</h3>
                <p className="text-sm text-muted-foreground">
                  This course structure integrates project-based learning with theoretical foundations. 
                  Capstone checkpoints are woven throughout to ensure progressive skill building.
                </p>
              </div>

              {/* Modules List */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-4">Course Modules</h2>
                {parseModuleGroups(syllabusData.modules).map((moduleGroup) => (
                  <div key={moduleGroup.moduleNumber} className="space-y-2">
                    {/* Module Header */}
                    <div className="bg-muted/50 border-l-4 border-l-primary p-3">
                      <h3 className="font-bold text-lg">{moduleGroup.moduleName}</h3>
                    </div>
                    
                    {/* Steps within the module */}
                    <div className="space-y-2 ml-4">
                      {moduleGroup.steps.map((step) => {
                        const sourceType = originalSources.find(s => s.url === step.sourceUrl)?.type || 
                                         syllabusData.rawSources?.find(s => s.url === step.sourceUrl)?.type || '';
                        const domainName = step.sourceUrl ? getDomainShortName(step.sourceUrl) : step.source;
                        
                        return (
                          <div
                            key={step.originalIndex}
                            className={cn(
                              "border overflow-hidden transition-all",
                              step.isCapstone && "bg-accent/10 border-accent"
                            )}
                          >
                            <button
                              onClick={() => toggleModule(step.originalIndex)}
                              className={cn(
                                "w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left",
                                step.tag === "Capstone Integration" && "border-l-4 border-l-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5"
                              )}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  {step.tag === "Capstone Integration" && (
                                    <span className="text-xl">🏛️</span>
                                  )}
                                  <h4 className="font-semibold">Step {step.stepNumber}: {step.stepTitle}</h4>
                                  <span className={cn(
                                    "text-xs px-2 py-1",
                                    step.tag === "Capstone Integration" 
                                      ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" 
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    {step.tag}
                                  </span>
                                  {/* Source badge with color matching pills */}
                                  <span className={cn(
                                    "text-xs px-2 py-1 inline-flex items-center gap-1",
                                    getSourceColor(sourceType)
                                  )}>
                                    {domainName}
                                  </span>
                                </div>
                                {step.sourceUrl && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <a
                                      href={step.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Source
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={cn(
                                "h-5 w-5 text-muted-foreground transition-transform",
                                expandedModules.has(step.originalIndex) && "rotate-90"
                              )} />
                            </button>
                            
                            {expandedModules.has(step.originalIndex) && (
                              <div className="px-4 pb-4 border-t bg-muted/20">
                                <div className="pt-4 text-sm text-muted-foreground">
                                  {step.isCapstone ? (
                                    <p>This is a project milestone where you'll apply what you've learned to your capstone project.</p>
                                  ) : (
                                    <p>Detailed content and resources will be populated after you approve this structure.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
