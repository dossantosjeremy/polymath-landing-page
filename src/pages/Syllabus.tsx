import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, ChevronRight, Home, ChevronDown, Bookmark, BookmarkCheck, BookOpen, Award, Sparkles, Plus, Lightbulb, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { LearningPlayer } from "@/components/LearningPlayer";
import { StepSummary } from "@/components/StepSummary";
import { CapstoneAssignment } from "@/components/CapstoneAssignment";
import { SmartLearningPathSettings, LearningPathConstraints, PruningStats } from "@/components/SmartLearningPathSettings";
import { CurriculumAuditCard } from "@/components/CurriculumAuditCard";
import { AdHocHeader, DomainAuthority } from "@/components/AdHocHeader";
import { AuthorityBadge } from "@/components/AuthorityBadge";
import { SyllabusMissionControl } from "@/components/SyllabusMissionControl";
import { GenerationProgressIndicator } from "@/components/GenerationProgressIndicator";
import { setPendingAction, getPendingAction, clearPendingAction } from "@/lib/pendingActions";

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  description?: string;
  isCapstone?: boolean;
  estimatedHours?: number;
  priority?: 'core' | 'important' | 'nice-to-have';
  isHiddenForTime?: boolean;
  isHiddenForDepth?: boolean;
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
  pruningStats?: PruningStats;
  learningPathSettings?: LearningPathConstraints;
  isAdHoc?: boolean;
  isAIEnhanced?: boolean;
  compositionType?: 'single' | 'composite_program' | 'vocational';
  derivedFrom?: string[];
  searchTerm?: string;
  topicPillars?: Array<{
    name: string;
    searchTerms: string[];
    recommendedSources: string[];
    priority: 'core' | 'important' | 'nice-to-have';
  }>;
  narrativeFlow?: string;
  synthesisRationale?: string;
  discoveredAuthorities?: Array<{
    name: string;
    domain: string;
    authorityType: 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';
    authorityReason: string;
    focusAreas: string[];
  }>;
}

// New Authorities Discovered Section Component
interface NewAuthoritiesSectionProps {
  authorities: Array<{
    name: string;
    domain: string;
    authorityType: 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';
    authorityReason: string;
    focusAreas: string[];
  }>;
  discipline: string;
}

function NewAuthoritiesSection({ authorities, discipline }: NewAuthoritiesSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addingAuthority, setAddingAuthority] = useState<string | null>(null);
  const [addedAuthorities, setAddedAuthorities] = useState<Set<string>>(new Set());

  const handleAddToSources = async (authority: NewAuthoritiesSectionProps['authorities'][0]) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save authorities to your sources.",
        variant: "destructive"
      });
      return;
    }

    setAddingAuthority(authority.domain);
    
    try {
      // Get current custom sources
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('custom_sources')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentSources = (profile?.custom_sources as Array<{name: string, url: string, type: string}>) || [];
      
      // Check if already exists
      if (currentSources.some(s => s.url.includes(authority.domain))) {
        toast({
          title: "Already added",
          description: `${authority.name} is already in your sources.`
        });
        setAddedAuthorities(prev => new Set([...prev, authority.domain]));
        setAddingAuthority(null);
        return;
      }

      // Add new source
      const newSource = {
        name: authority.name,
        url: `https://${authority.domain}`,
        type: authority.authorityType === 'industry_standard' ? 'Industry Standard' :
              authority.authorityType === 'standard_body' ? 'Standard Body' :
              authority.authorityType === 'practitioner' ? 'Elite Practitioner' : 'Academic'
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          custom_sources: [...currentSources, newSource],
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAddedAuthorities(prev => new Set([...prev, authority.domain]));
      toast({
        title: "Source added",
        description: `${authority.name} has been added to your custom sources.`
      });
    } catch (error) {
      console.error('Failed to add authority:', error);
      toast({
        title: "Failed to add",
        description: "Could not add authority to your sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingAuthority(null);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-[hsl(var(--gold))]/30 rounded-lg bg-[hsl(var(--gold))]/5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-[hsl(var(--gold))]" />
        <h3 className="font-semibold">New Authorities Discovered</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These industry leaders were identified as authoritative for "{discipline}". 
        Add them to your sources to use them in future searches.
      </p>
      <div className="space-y-3">
        {authorities.map((auth, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-card border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{auth.name}</span>
                <AuthorityBadge type={auth.authorityType} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{auth.authorityReason}</p>
              <p className="text-xs text-blue-500 mt-1">{auth.domain}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 ml-3"
              onClick={() => handleAddToSources(auth)}
              disabled={addingAuthority === auth.domain || addedAuthorities.has(auth.domain)}
            >
              {addingAuthority === auth.domain ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : addedAuthorities.has(auth.domain) ? (
                <>
                  <BookmarkCheck className="h-3 w-3 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Sources
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [expandedModuleGroups, setExpandedModuleGroups] = useState<Set<number>>(new Set([1])); // First module open by default
  const [learningSettings, setLearningSettings] = useState<LearningPathConstraints>({
    depth: 'standard',
    hoursPerWeek: 5,
    skillLevel: 'beginner'
  });
  const [applyingConstraints, setApplyingConstraints] = useState(false);
  const [pruningStats, setPruningStats] = useState<PruningStats | undefined>();
  const [useMissionControl, setUseMissionControl] = useState(true); // Enable by default

  const discipline = searchParams.get("discipline") || "";
  const path = searchParams.get("path") || "";
  const savedId = searchParams.get("savedId");
  const stepToScroll = searchParams.get("step");
  const useCache = searchParams.get("useCache") === "true";
  const isAdHoc = searchParams.get("isAdHoc") === "true";
  const searchTerm = searchParams.get("searchTerm") || discipline;
  const useAIEnhanced = searchParams.get("useAIEnhanced") === "true";
  
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

  // Scroll to step if specified in URL
  useEffect(() => {
    if (stepToScroll && syllabusData && !loading) {
      setTimeout(() => {
        const modules = syllabusData.modules;
        
        // Find the module by matching title (raw title from schedule_events)
        const moduleIndex = modules.findIndex(m => m.title === stepToScroll);
        
        if (moduleIndex !== -1) {
          // Parse module groups to find which group contains this step
          const visibleModules = modules.filter(m => !m.isHiddenForTime && !m.isHiddenForDepth);
          const moduleGroups = parseModuleGroups(visibleModules);
          
          // Find which group contains this originalIndex
          const groupContainingStep = moduleGroups.find(g => 
            g.steps.some(s => s.originalIndex === moduleIndex)
          );
          
          if (groupContainingStep) {
            // Expand the module group
            setExpandedModuleGroups(prev => new Set([...prev, groupContainingStep.moduleNumber]));
          }
          
          // Also expand the individual step
          setExpandedModules(prev => new Set([...prev, moduleIndex]));
          
          // Scroll to the step element
          setTimeout(() => {
            const element = document.getElementById(`step-${moduleIndex}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add visual highlight
              element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
              setTimeout(() => {
                element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
              }, 3000);
            }
          }, 100);
        }
      }, 500);
    }
  }, [stepToScroll, syllabusData, loading]);

  useEffect(() => {
    if (savedId) {
      loadSavedSyllabus(savedId);
    } else if (useCache && discipline) {
      loadCachedSyllabus();
    } else if (discipline) {
      // Pass constraints but don't force refresh - let backend check cache first
      generateSyllabus(undefined, preGenerationConstraints, false);
    }
  }, [discipline, savedId, useCache]);

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
        // No cache found, fall back to generation
        console.log('No cached syllabus found, generating fresh...');
        await generateSyllabus();
        return;
      }

      setSyllabusData({
        discipline: data.discipline,
        modules: data.modules as any as Module[],
        source: data.source,
        rawSources: data.raw_sources as any as DiscoveredSource[],
        timestamp: data.created_at
      });
      
      // Mark as not saved to user's personal collection
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

  // Color palette for distinguishing sources (10 colors)
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
        'openstax.org': 'OpenStax',
        'ischool.utexas.edu': 'iSchool',
        'opencw.org': 'OPENCW'
      };
      return domainMap[hostname] || hostname.split('.')[0].toUpperCase();
    } catch {
      return 'Source';
    }
  };

  // Helper function to extract course code or distinguishing identifier
  const extractCourseCode = (url: string, courseName: string = ''): string => {
    // Try to extract course code from URL (e.g., "24-120", "24.120")
    const codeMatch = url.match(/(\d{2,3}[-._]?\d{3})/);
    if (codeMatch) return codeMatch[1].replace(/[-_]/g, '.');
    
    // Try to extract from course name
    if (courseName) {
      const nameMatch = courseName.match(/^(\d+\.\d+|\d+[-_]\d+)/);
      if (nameMatch) return nameMatch[1];
      
      // Try to extract descriptive suffix (e.g., "Readings", "Lecture Notes")
      if (courseName.includes(' - ')) {
        const suffix = courseName.split(' - ').pop();
        if (suffix && suffix.length < 20) return suffix;
      }
      
      // Try to get a short identifier from the course name itself
      const words = courseName.split(' ');
      if (words.length > 1 && words[words.length - 1].length < 15) {
        return words[words.length - 1];
      }
    }
    
    return '';
  };

  // Get color by source URL index in discovered sources (for visual consistency)
  const getSourceColorByUrl = (url: string): string => {
    const rawSources = originalSources.length > 0 ? originalSources : syllabusData?.rawSources || [];
    const index = rawSources.findIndex(s => s.url === url);
    if (index === -1) return "bg-muted/50 text-muted-foreground border-muted";
    return SOURCE_COLORS[index % SOURCE_COLORS.length];
  };

  // Helper function to get color for source type (legacy, kept for compatibility)
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
    moduleSubtitle?: string;
    steps: Array<Module & { stepNumber: number; stepTitle: string; originalIndex: number }>;
  }

  const parseModuleGroups = (modules: Module[]): ModuleGroup[] => {
    // Process ALL modules in their original order, keeping capstones distributed
    const groups: ModuleGroup[] = [];
    let currentGroup: Array<Module & { originalIndex: number }> = [];
    let currentTag = '';
    let moduleNumber = 1;
    const tagCounts: Record<string, number> = {}; // Track continuous numbering per tag type
    
    modules.forEach((module, idx) => {
      // Only treat as isolated capstone if explicitly marked as capstone
      if (module.isCapstone === true) {
        // Finalize current group first
        if (currentGroup.length > 0) {
          // Split large groups into modules of 3-5 steps
          for (let i = 0; i < currentGroup.length; i += 4) {
            const chunk = currentGroup.slice(i, Math.min(i + 5, currentGroup.length));
            const totalChunks = Math.ceil(currentGroup.length / 4);
            
            // Increment tag count for continuous numbering
            tagCounts[currentTag] = (tagCounts[currentTag] || 0) + 1;
            
            // Generate subtitle with first 3 step titles
            const stepTitles = chunk.map(item => item.title).slice(0, 3);
            const hasMore = chunk.length > 3;
            const moduleSubtitle = stepTitles.join(', ') + (hasMore ? '...' : '');
            
            let moduleName = currentTag;
            if (totalChunks > 1) {
              moduleName = `${currentTag} ${tagCounts[currentTag]}`;
            }
            
            groups.push({
              moduleNumber: moduleNumber++,
              moduleName,
              moduleSubtitle,
              steps: chunk.map((item, stepIdx) => ({
                ...item,
                stepNumber: stepIdx + 1,
                stepTitle: item.title
                  .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
                  .replace(/^Step\s+\d+:\s*/i, '')
                  .replace(/^Week\s+\d+:\s*/i, '')
                  .trim()
              }))
            });
          }
          currentGroup = [];
        }
        
        // Add capstone as single-step module with step title as module name
        const capstoneTitle = module.title
          .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
          .replace(/^Step\s+\d+:\s*/i, '')
          .replace(/^Week\s+\d+:\s*/i, '')
          .trim();
        
        groups.push({
          moduleNumber: moduleNumber++,
          moduleName: `${moduleNumber - 1}. ${capstoneTitle}`,
          steps: [{ 
            ...module, 
            stepNumber: 1, 
            stepTitle: capstoneTitle,
            tag: 'Capstone Integration',
            originalIndex: idx
          }]
        });
        return;
      }
      
      // Regular module processing
      // Remap "Capstone & Integration" tag to "Applied" for non-capstone steps
      const rawTag = module.tag || 'General';
      const tag = (rawTag === 'Capstone & Integration' || rawTag === 'Capstone Integration') && !module.isCapstone
        ? 'Applied'
        : rawTag;
      const cleanTitle = module.title
        .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
        .replace(/^Step\s+\d+:\s*/i, '')
        .replace(/^Week\s+\d+:\s*/i, '')
        .trim();
      
      if (tag !== currentTag && currentTag !== '') {
        // Tag changed - finalize current group
        if (currentGroup.length > 0) {
          for (let i = 0; i < currentGroup.length; i += 4) {
            const chunk = currentGroup.slice(i, Math.min(i + 5, currentGroup.length));
            const totalChunks = Math.ceil(currentGroup.length / 4);
            
            // Increment tag count for continuous numbering
            tagCounts[currentTag] = (tagCounts[currentTag] || 0) + 1;
            
            // Generate subtitle with first 3 step titles
            const stepTitles = chunk.map(item => item.title).slice(0, 3);
            const hasMore = chunk.length > 3;
            const moduleSubtitle = stepTitles.join(', ') + (hasMore ? '...' : '');
            
            let moduleName = currentTag;
            if (totalChunks > 1) {
              moduleName = `${currentTag} ${tagCounts[currentTag]}`;
            }
            
            groups.push({
              moduleNumber: moduleNumber++,
              moduleName,
              moduleSubtitle,
              steps: chunk.map((item, stepIdx) => ({
                ...item,
                stepNumber: stepIdx + 1,
                stepTitle: item.title
                  .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
                  .replace(/^Step\s+\d+:\s*/i, '')
                  .replace(/^Week\s+\d+:\s*/i, '')
                  .trim()
              }))
            });
          }
        }
        currentGroup = [];
      }
      
      // Add to current group
      currentGroup.push({ ...module, title: cleanTitle, originalIndex: idx });
      currentTag = tag;
      
      // Handle last module
      if (idx === modules.length - 1 && currentGroup.length > 0) {
        for (let i = 0; i < currentGroup.length; i += 4) {
          const chunk = currentGroup.slice(i, Math.min(i + 5, currentGroup.length));
          const totalChunks = Math.ceil(currentGroup.length / 4);
          
          // Increment tag count for continuous numbering
          tagCounts[currentTag] = (tagCounts[currentTag] || 0) + 1;
          
          // Generate subtitle with first 3 step titles
          const stepTitles = chunk.map(item => item.title).slice(0, 3);
          const hasMore = chunk.length > 3;
          const moduleSubtitle = stepTitles.join(', ') + (hasMore ? '...' : '');
          
          let moduleName = currentTag;
          if (totalChunks > 1) {
            moduleName = `${currentTag} ${tagCounts[currentTag]}`;
          }
          
          groups.push({
            moduleNumber: moduleNumber++,
            moduleName,
            moduleSubtitle,
            steps: chunk.map((item, stepIdx) => ({
              ...item,
              stepNumber: stepIdx + 1,
              stepTitle: item.title
                .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
                .replace(/^Step\s+\d+:\s*/i, '')
                .replace(/^Week\s+\d+:\s*/i, '')
                .trim()
            }))
          });
        }
      }
    });
    
    return groups;
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

  const generateSyllabus = async (
    selectedSourceUrls?: string[], 
    constraintsOverride?: LearningPathConstraints,
    forceRefresh?: boolean
  ) => {
    // Only treat as regenerating if sources are being changed OR force refresh requested
    const isRegenerating = !!selectedSourceUrls || forceRefresh === true;
    if (isRegenerating) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Fetch user's source preferences
      let customSources = [];
      let enabledSources = [];
      
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

      // Preserve original sources when regenerating
      setSyllabusData({
        ...data,
        rawSources: originalSources.length > 0 ? originalSources : data.rawSources
      });
      
      // Update pruning stats if provided
      if (data.pruningStats) {
        setPruningStats(data.pruningStats);
      }
      
      if (isRegenerating) {
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

  const toggleModule = (index: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedModules(newExpanded);
  };

  const toggleModuleGroup = (moduleNumber: number) => {
    const newExpanded = new Set(expandedModuleGroups);
    if (newExpanded.has(moduleNumber)) {
      newExpanded.delete(moduleNumber);
    } else {
      newExpanded.add(moduleNumber);
    }
    setExpandedModuleGroups(newExpanded);
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

  const handleApplyConstraints = async (constraints: LearningPathConstraints) => {
    setLearningSettings(constraints);
    setApplyingConstraints(true);
    try {
      // Pass constraints directly (not learningSettings) since state update is async
      await generateSyllabus(undefined, constraints, true);
    } finally {
      setApplyingConstraints(false);
    }
  };

  const saveSyllabus = async () => {
    if (!syllabusData) return;

    if (!user) {
      // Store pending action and redirect to auth
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

    // Validate session before attempting save
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

  // Execute pending action after login (auto-save)
  useEffect(() => {
    const executePendingAction = async () => {
      if (!user || !syllabusData || isSaved) return;
      
      const pendingAction = getPendingAction();
      if (!pendingAction || pendingAction.type !== 'save_syllabus') return;
      
      // Clear immediately to prevent double execution
      clearPendingAction();
      
      // Auto-save
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

          {/* Ad-Hoc Generation Banner - Enhanced Curriculum Architect UI (also for AI-Enhanced mode) */}
          {!loading && (syllabusData?.isAdHoc || syllabusData?.isAIEnhanced) && (
            <AdHocHeader
              discipline={discipline}
              compositionType={syllabusData.compositionType}
              derivedFrom={syllabusData.derivedFrom}
              topicPillars={syllabusData.topicPillars}
              narrativeFlow={syllabusData.narrativeFlow}
              synthesisRationale={syllabusData.synthesisRationale}
              sourceCount={syllabusData.rawSources?.length || 0}
              sourceNames={(syllabusData.rawSources || []).map(s => getDomainShortName(s.url)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5)}
              discoveredAuthorities={syllabusData.discoveredAuthorities}
            />
          )}

          {/* AI-Enhanced Mode Banner for database disciplines */}
          {!loading && !syllabusData?.isAdHoc && useAIEnhanced && syllabusData?.discoveredAuthorities && syllabusData.discoveredAuthorities.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">AI-Enhanced Search Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Combining academic sources with industry authorities discovered for "{discipline}"
              </p>
              <div className="flex flex-wrap gap-2">
                {syllabusData.discoveredAuthorities.slice(0, 5).map((auth, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                    {auth.authorityType === 'industry_standard' && '🏆'}
                    {auth.authorityType === 'practitioner' && '⭐'}
                    {auth.authorityType === 'standard_body' && '📋'}
                    {auth.authorityType === 'academic' && '🎓'}
                    {auth.name}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* Learning Path Settings - only show when syllabus is loaded */}
          {!loading && syllabusData && (
            <SmartLearningPathSettings
              onGenerate={handleApplyConstraints}
              pruningStats={pruningStats || syllabusData.pruningStats}
              isGenerating={applyingConstraints}
            />
          )}

          {loading ? (
            <GenerationProgressIndicator 
              discipline={discipline}
              isAdHoc={isAdHoc}
              useAIEnhanced={useAIEnhanced}
            />
          ) : syllabusData ? (
            <div className="space-y-6">

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
                          {sourcesToDisplay.map((source, idx) => {
                            // Calculate how many times this source appears in the final syllabus
                            const usageCount = syllabusData.modules.filter(m => {
                              const urls = m.sourceUrls || (m.sourceUrl ? [m.sourceUrl] : []);
                              return urls.includes(source.url);
                            }).length;
                            
                            return (
                          <div key={idx} className="border bg-background">
                            <div className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedSources.has(idx)}
                                  onCheckedChange={() => toggleSourceSelection(idx)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                    {usageCount > 0 && (
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        ✓ Used in {usageCount} step{usageCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
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
                                  {source.content && source.content !== '[[EXTRACTION_FAILED]]' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                      <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono">
                                        {source.content}
                                      </pre>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground space-y-2">
                                      <p className="italic">Original syllabus content could not be automatically extracted.</p>
                                      <a 
                                        href={source.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" /> View original source directly
                                      </a>
                                      <p className="text-xs">Note: This source is still being used to inform the generated syllabus structure.</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                            );
                          })}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* New Authorities Discovered Section - For Ad-Hoc or AI-Enhanced syllabi with discovered authorities */}
              {(syllabusData.isAdHoc || syllabusData.isAIEnhanced) && syllabusData.discoveredAuthorities && syllabusData.discoveredAuthorities.length > 0 && (
                <NewAuthoritiesSection 
                  authorities={syllabusData.discoveredAuthorities}
                  discipline={discipline}
                />
              )}

              {/* Mission Control Split-Screen Interface */}
              <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Course Modules</h2>
                <SyllabusMissionControl
                  key={`mission-control-${syllabusData.modules.length}-${syllabusData.timestamp || Date.now()}`}
                  modules={syllabusData.modules}
                  discipline={discipline}
                  rawSources={originalSources.length > 0 ? originalSources : syllabusData.rawSources}
                  onConfirm={async (selectedIndices) => {
                    // This callback is called when the user confirms their path selection
                    // The content is generated lazily in the StagePanel
                    toast({
                      title: "Path Confirmed",
                      description: `Your personalized learning path with ${selectedIndices.length} steps is ready.`,
                    });
                  }}
                  getDomainShortName={getDomainShortName}
                  extractCourseCode={extractCourseCode}
                  getSourceColorByUrl={getSourceColorByUrl}
                />
              </div>

              {/* Curriculum Audit Card - Ivy League Benchmark Widget (at bottom) */}
              {(() => {
                const sourcesToDisplay = originalSources.length > 0 ? originalSources : syllabusData.rawSources || [];
                
                // Compute sources actually used in the syllabus
                const usedSourceUrls = new Set<string>();
                syllabusData.modules.forEach(m => {
                  if (m.sourceUrl) usedSourceUrls.add(m.sourceUrl);
                  if (m.sourceUrls) m.sourceUrls.forEach(url => usedSourceUrls.add(url));
                });
                
                // Show ALL used sources (not deduplicated by domain)
                const usedSources = sourcesToDisplay.filter(source => usedSourceUrls.has(source.url));
                
                if (usedSources.length === 0) return null;
                
                return (
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Optimization Report</h3>
                          <span className="text-sm text-muted-foreground">
                            ({usedSources.length} sources)
                          </span>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CurriculumAuditCard
                        rawSources={usedSources}
                        pruningStats={pruningStats || syllabusData.pruningStats}
                        onRestoreAll={() => handleApplyConstraints({ 
                          depth: 'detailed',
                          hoursPerWeek: learningSettings.hoursPerWeek,
                          skillLevel: learningSettings.skillLevel
                        })}
                        getDomainShortName={getDomainShortName}
                        extractCourseCode={extractCourseCode}
                        getSourceColorByUrl={getSourceColorByUrl}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Syllabus;
