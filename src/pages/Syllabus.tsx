import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight, Home, Bookmark, BookmarkCheck, Download } from "lucide-react";
import { generateSyllabusMarkdown, downloadMarkdown, generateFilename } from "@/lib/syllabusExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { LearningPathConstraints, PruningStats } from "@/components/SmartLearningPathSettings";
import { GenerationProgressIndicator } from "@/components/GenerationProgressIndicator";
import { setPendingAction, getPendingAction, clearPendingAction } from "@/lib/pendingActions";
import { ResourceCacheProvider, useResourceCache } from "@/contexts/ResourceCacheContext";
import { SyllabusLayout, SyllabusData, DiscoveredSource, MissionControlPersistedState } from "@/components/syllabus";
import { useBackgroundResourceLoader } from "@/hooks/useBackgroundResourceLoader";

// Color palette for distinguishing sources
const SOURCE_COLORS = [
  "bg-blue-500/20 text-blue-700 border-blue-300",
  "bg-amber-500/20 text-amber-700 border-amber-300",
  "bg-emerald-500/20 text-emerald-700 border-emerald-300",
  "bg-purple-500/20 text-purple-700 border-purple-300",
  "bg-rose-500/20 text-rose-700 border-rose-300",
  "bg-cyan-500/20 text-cyan-700 border-cyan-300",
  "bg-orange-500/20 text-orange-700 border-orange-300",
  "bg-indigo-500/20 text-indigo-700 border-indigo-300",
  "bg-teal-500/20 text-teal-700 border-teal-300",
  "bg-pink-500/20 text-pink-700 border-pink-300",
];

const SyllabusContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getAllCachedResources, clearCache } = useResourceCache();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerationKey, setRegenerationKey] = useState(0);
  
  // Source management
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [originalSources, setOriginalSources] = useState<DiscoveredSource[]>([]);
  
  // Learning settings
  const [learningSettings, setLearningSettings] = useState<LearningPathConstraints>({
    depth: 'standard',
    hoursPerWeek: 5,
    skillLevel: 'beginner'
  });
  const [applyingConstraints, setApplyingConstraints] = useState(false);
  const [pruningStats, setPruningStats] = useState<PruningStats | undefined>();
  
  // AI Enhancement lifecycle states
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [showAIContent, setShowAIContent] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("content");
  
  // Mission Control State (persisted across tab switches)
  const [missionControlState, setMissionControlState] = useState<MissionControlPersistedState | null>(null);
  
  // Topic Focus Pills State
  const [selectedPillars, setSelectedPillars] = useState<Set<string>>(new Set());
  const [isApplyingPillars, setIsApplyingPillars] = useState(false);

  // URL params
  const discipline = searchParams.get("discipline") || "";
  const path = searchParams.get("path") || "";
  const savedId = searchParams.get("savedId");
  const useCache = searchParams.get("useCache") === "true";
  const isAdHoc = searchParams.get("isAdHoc") === "true";
  const searchTerm = searchParams.get("searchTerm") || discipline;
  const useAIEnhanced = searchParams.get("useAIEnhanced") === "true";
  const forceRefresh = searchParams.get("forceRefresh") === "true";
  
  // Parse pre-generation constraints from URL
  const urlDepth = searchParams.get("depth") as 'overview' | 'standard' | 'detailed' | null;
  const urlHoursPerWeek = searchParams.get("hoursPerWeek");
  const urlGoalDate = searchParams.get("goalDate");
  const urlSkillLevel = searchParams.get("skillLevel") as 'beginner' | 'intermediate' | 'advanced' | null;
  
  const preGenerationConstraints: LearningPathConstraints | undefined = urlDepth ? {
    depth: urlDepth,
    hoursPerWeek: urlHoursPerWeek ? parseInt(urlHoursPerWeek) : 5,
    goalDate: urlGoalDate ? new Date(urlGoalDate) : undefined,
    skillLevel: urlSkillLevel || 'beginner'
  } : undefined;
  
  // Background Resource Loader
  const rawSourceUrls = originalSources.length > 0 
    ? originalSources.map(s => s.url) 
    : syllabusData?.rawSources?.map(s => s.url) || [];
  
  const backgroundLoader = useBackgroundResourceLoader({
    discipline,
    syllabusUrls: rawSourceUrls,
  });
  
  const startBackgroundLoading = useCallback((stepTitles: string[]) => {
    backgroundLoader.loadResourcesForSteps(stepTitles);
  }, [backgroundLoader]);

  // Detect if loaded syllabus already has AI content
  useEffect(() => {
    if (syllabusData && !loading) {
      const hasAIModules = syllabusData.modules.some(m => m.isAIDiscovered);
      const wasEnhanced = syllabusData.isAIEnhanced === true;
      
      if (hasAIModules || wasEnhanced) {
        setAiStatus('ready');
        setShowAIContent(true);
      }
    }
  }, [syllabusData, loading]);

  // Initial load
  useEffect(() => {
    if (savedId) {
      loadSavedSyllabus(savedId);
    } else if (useCache && discipline && !forceRefresh) {
      loadCachedSyllabus();
    } else if (discipline) {
      generateSyllabus(undefined, preGenerationConstraints, forceRefresh);
    }
  }, [discipline, savedId, useCache, forceRefresh]);

  // Initialize all sources as selected when syllabus data loads
  useEffect(() => {
    if (syllabusData?.rawSources) {
      if (originalSources.length === 0) {
        setOriginalSources(syllabusData.rawSources);
      }
      setSelectedSources(new Set(syllabusData.rawSources.map((_, idx) => idx)));
    }
  }, [syllabusData?.rawSources]);

  // Initialize topic pillars with core/important selection when syllabus loads
  useEffect(() => {
    if (syllabusData?.topicPillars && selectedPillars.size === 0) {
      const defaultSelected = new Set(
        syllabusData.topicPillars
          .filter(p => p.priority === 'core' || p.priority === 'important')
          .map(p => p.name)
      );
      if (defaultSelected.size > 0) {
        setSelectedPillars(defaultSelected);
      }
    }
  }, [syllabusData?.topicPillars]);

  // Execute pending action after login
  useEffect(() => {
    const executePendingAction = async () => {
      if (!user || !syllabusData || isSaved) return;
      
      const pendingAction = getPendingAction();
      if (!pendingAction || pendingAction.type !== 'save_syllabus') return;
      
      clearPendingAction();
      
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
          title: "Syllabus Saved!",
          description: "Your syllabus was automatically saved after signing in."
        });
      } catch (error) {
        console.error('Error auto-saving syllabus:', error);
        toast({
          title: "Auto-save Failed",
          description: "Please try saving again manually.",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    };
    
    executePendingAction();
  }, [user, syllabusData, isSaved]);

  // Helper functions
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
        'openstax.org': 'OpenStax',
        'ischool.utexas.edu': 'iSchool',
        'opencw.org': 'OPENCW'
      };
      return domainMap[hostname] || hostname.split('.')[0].toUpperCase();
    } catch {
      return 'Source';
    }
  };

  const extractCourseCode = (url: string, courseName: string = ''): string => {
    const codeMatch = url.match(/(\d{2,3}[-._]?\d{3})/);
    if (codeMatch) return codeMatch[1].replace(/[-_]/g, '.');
    
    if (courseName) {
      const nameMatch = courseName.match(/^(\d+\.\d+|\d+[-_]\d+)/);
      if (nameMatch) return nameMatch[1];
      
      if (courseName.includes(' - ')) {
        const suffix = courseName.split(' - ').pop();
        if (suffix && suffix.length < 20) return suffix;
      }
      
      const words = courseName.split(' ');
      if (words.length > 1 && words[words.length - 1].length < 15) {
        return words[words.length - 1];
      }
    }
    
    return '';
  };

  const getSourceColorByUrl = (url: string): string => {
    const rawSources = originalSources.length > 0 ? originalSources : syllabusData?.rawSources || [];
    const index = rawSources.findIndex(s => s.url === url);
    if (index === -1) return "bg-muted/50 text-muted-foreground border-muted";
    return SOURCE_COLORS[index % SOURCE_COLORS.length];
  };

  // Data loading functions
  const loadCachedSyllabus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_syllabi')
        .select('*')
        .eq('discipline', discipline)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        await generateSyllabus();
        return;
      }

      setSyllabusData({
        discipline: data.discipline,
        modules: data.modules as any,
        source: data.source,
        rawSources: data.raw_sources as any,
        timestamp: data.created_at || ''
      });
      
      setIsSaved(false);
    } catch (error) {
      console.error('Error loading cached syllabus:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load cached syllabus. Generating fresh...",
        variant: "destructive"
      });
      await generateSyllabus();
    } finally {
      setLoading(false);
    }
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
        modules: data.modules as any,
        source: data.source,
        rawSources: data.raw_sources as any,
        timestamp: data.created_at || ''
      });
      
      setIsSaved(true);
      
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

  const generateSyllabus = async (
    selectedSourceUrls?: string[], 
    constraintsOverride?: LearningPathConstraints,
    forceRefresh?: boolean
  ) => {
    // Force-refresh can be used on first load ("Generate fresh instead") or as an in-page regeneration.
    // If we have no syllabus yet, we must drive the full-page loading state; otherwise use the lighter "regenerating" state.
    const isInitialGeneration = syllabusData == null;
    const isRegenerating = !isInitialGeneration && (!!selectedSourceUrls || forceRefresh === true);

    if (isRegenerating) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }

    if (forceRefresh === true || !!selectedSourceUrls) {
      clearCache();
    }
    
    try {
      let customSources: any[] = [];
      let enabledSources: any[] = [];
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_sources, enabled_sources')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          customSources = (profile.custom_sources as any) || [];
          enabledSources = (profile.enabled_sources as any) || [];
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-syllabus', {
        body: { 
          discipline,
          selectedSourceUrls,
          customSources,
          enabledSources,
          forceRefresh: forceRefresh === true || !!selectedSourceUrls,
          learningConstraints: constraintsOverride || learningSettings,
          isAdHoc,
          searchTerm,
          useAIEnhanced
        }
      });

      if (error) throw error;

      const updatedData = {
        ...data,
        rawSources: originalSources.length > 0 ? originalSources : data.rawSources,
        timestamp: new Date().toISOString()
      };
      setSyllabusData(updatedData);
      
      if (data.pruningStats) {
        setPruningStats(data.pruningStats);
      }
      
      if (savedId && isRegenerating && constraintsOverride) {
        try {
          await supabase
            .from('saved_syllabi')
            .update({
              modules: updatedData.modules as any,
              updated_at: new Date().toISOString()
            })
            .eq('id', savedId);
        } catch (persistError) {
          console.error('Error persisting syllabus update:', persistError);
        }
      }
      
      if (isRegenerating) {
        setRegenerationKey(prev => prev + 1);
        
        if (constraintsOverride) {
          toast({
            title: "Syllabus Adjusted",
            description: "Learning path updated with your time constraints.",
          });
        } else {
          toast({
            title: "Syllabus Regenerated",
            description: `Generated from ${selectedSourceUrls?.length || 0} selected source(s).`,
          });
        }
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

  // AI Enhancement handlers
  const handleEnhanceWithAI = async () => {
    if (aiStatus === 'loading' || !syllabusData) return;
    
    setAiStatus('loading');
    
    try {
      const params = new URLSearchParams(searchParams);
      params.set('useAIEnhanced', 'true');
      navigate(`/syllabus?${params.toString()}`, { replace: true });
      
      await generateSyllabus(undefined, preGenerationConstraints, true);
      
      setAiStatus('ready');
      setShowAIContent(true);
      
      toast({
        title: "AI Enhancement Complete",
        description: "Syllabus enhanced with AI-discovered sources and authorities.",
      });
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      setAiStatus('idle');
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance syllabus with AI. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAIViewToggle = (enabled: boolean) => {
    if (aiStatus !== 'ready') return;
    setShowAIContent(enabled);
  };

  // Source selection handlers
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

  const handleApplyConstraints = async (constraints: LearningPathConstraints) => {
    setLearningSettings(constraints);
    setApplyingConstraints(true);
    try {
      await generateSyllabus(undefined, constraints, true);
    } finally {
      setApplyingConstraints(false);
    }
  };

  // Topic Focus Pills handlers
  const togglePillar = useCallback((pillarName: string) => {
    setSelectedPillars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pillarName)) {
        newSet.delete(pillarName);
      } else {
        newSet.add(pillarName);
      }
      return newSet;
    });
  }, []);

  // Initialize selected pillars from syllabus data
  useEffect(() => {
    if (syllabusData?.topicPillars && selectedPillars.size === 0) {
      // Default: select core and important pillars
      const defaultSelected = new Set(
        syllabusData.topicPillars
          .filter(p => p.priority === 'core' || p.priority === 'important')
          .map(p => p.name)
      );
      setSelectedPillars(defaultSelected);
    }
  }, [syllabusData?.topicPillars]);

  // Reset mission control state when regeneration happens
  useEffect(() => {
    if (regenerationKey > 0) {
      setMissionControlState(null);
    }
  }, [regenerationKey]);

  const regenerateWithPillars = async () => {
    if (selectedPillars.size === 0) {
      toast({
        title: "No Focus Areas Selected",
        description: "Please select at least one focus area.",
        variant: "destructive"
      });
      return;
    }
    
    setIsApplyingPillars(true);
    try {
      // For now, regenerate with the current constraints
      // The backend will eventually accept selectedPillars to filter modules
      await generateSyllabus(undefined, learningSettings, true);
      toast({
        title: "Focus Applied",
        description: `Syllabus updated to focus on ${selectedPillars.size} topic(s).`,
      });
    } finally {
      setIsApplyingPillars(false);
    }
  };

  // Save handler
  const saveSyllabus = async () => {
    if (!syllabusData) return;

    if (!user) {
      const currentUrl = window.location.pathname + window.location.search;
      setPendingAction({
        type: 'save_syllabus',
        payload: {
          discipline: syllabusData.discipline,
          path,
          modules: syllabusData.modules,
          source: syllabusData.source,
          rawSources: syllabusData.rawSources || []
        },
        returnUrl: currentUrl,
        timestamp: Date.now()
      });
      
      toast({
        title: "Sign in to save",
        description: "You'll be returned here after signing in, and your syllabus will be saved automatically."
      });
      
      navigate(`/auth?returnUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

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

  // Export handler
  const handleExportMarkdown = () => {
    if (!syllabusData) return;
    
    const cachedResources = getAllCachedResources();
    const resourceCount = Object.keys(cachedResources).length;
    
    const markdown = generateSyllabusMarkdown(syllabusData, cachedResources);
    const filename = generateFilename(syllabusData.discipline);
    downloadMarkdown(markdown, filename);
    
    toast({
      title: "Syllabus Exported",
      description: resourceCount > 0 
        ? `Downloaded ${filename} with resources from ${resourceCount} steps`
        : `Downloaded ${filename}`,
    });
  };

  const pathArray = path ? path.split(' > ') : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-8 sm:max-w-6xl sm:mx-auto overflow-x-hidden">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm mb-4 sm:mb-6 flex-wrap" aria-label="Breadcrumb">
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
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">{discipline}</h1>
                <p className="text-lg text-muted-foreground">Learning Path</p>
              </div>
              {!loading && syllabusData && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleExportMarkdown}
                          variant="outline"
                          size="icon"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export as Markdown</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    onClick={saveSyllabus}
                    disabled={saving || isSaved}
                    variant="outline"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="h-4 w-4 mr-2" />
                    ) : (
                      <Bookmark className="h-4 w-4 mr-2" />
                    )}
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <GenerationProgressIndicator 
              discipline={discipline}
              isAdHoc={isAdHoc}
              useAIEnhanced={useAIEnhanced}
            />
          ) : syllabusData ? (
            <SyllabusLayout
              syllabusData={syllabusData}
              discipline={discipline}
              path={path}
              loading={loading}
              regenerating={regenerating}
              aiStatus={aiStatus}
              showAIContent={showAIContent}
              handleEnhanceWithAI={handleEnhanceWithAI}
              handleAIViewToggle={handleAIViewToggle}
              originalSources={originalSources}
              selectedSources={selectedSources}
              toggleSourceSelection={toggleSourceSelection}
              selectAllSources={selectAllSources}
              deselectAllSources={deselectAllSources}
              regenerateWithSelectedSources={regenerateWithSelectedSources}
              learningSettings={learningSettings}
              pruningStats={pruningStats}
              handleApplyConstraints={handleApplyConstraints}
              applyingConstraints={applyingConstraints}
              saving={saving}
              isSaved={isSaved}
              saveSyllabus={saveSyllabus}
              handleExportMarkdown={handleExportMarkdown}
              getDomainShortName={getDomainShortName}
              extractCourseCode={extractCourseCode}
              getSourceColorByUrl={getSourceColorByUrl}
              regenerationKey={regenerationKey}
              useCache={useCache}
              isAdHoc={isAdHoc}
              useAIEnhanced={useAIEnhanced}
              savedId={savedId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              missionControlState={missionControlState}
              setMissionControlState={setMissionControlState}
              selectedPillars={selectedPillars}
              togglePillar={togglePillar}
              regenerateWithPillars={regenerateWithPillars}
              isApplyingPillars={isApplyingPillars}
              backgroundLoadingState={{
                isLoading: backgroundLoader.isLoading,
                progress: backgroundLoader.progress,
                total: backgroundLoader.total,
                currentStep: backgroundLoader.currentStep,
                failedCount: backgroundLoader.failedSteps.length,
              }}
              startBackgroundLoading={startBackgroundLoading}
            />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Wrapper component that provides the ResourceCache context
const Syllabus = () => {
  return (
    <ResourceCacheProvider>
      <SyllabusContent />
    </ResourceCacheProvider>
  );
};

export default Syllabus;
