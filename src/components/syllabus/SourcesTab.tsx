import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProvenanceBadge, determineContentSource } from "@/components/ProvenanceBadge";
import { AuthorityBadge } from "@/components/AuthorityBadge";
import { Loader2, ExternalLink, ChevronDown, Lightbulb, Plus, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyllabusContext } from "./SyllabusContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function SourcesTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    syllabusData,
    discipline,
    originalSources,
    selectedSources,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
    regenerateWithSelectedSources,
    regenerating,
    aiStatus,
    showAIContent,
    useCache,
    getDomainShortName,
    getSourceColorByUrl,
  } = useSyllabusContext();

  const [expandedSourceContent, setExpandedSourceContent] = useState<Set<number>>(new Set());
  const [addingAuthority, setAddingAuthority] = useState<string | null>(null);
  const [addedAuthorities, setAddedAuthorities] = useState<Set<string>>(new Set());

  if (!syllabusData) return null;

  const sourcesToDisplay = originalSources.length > 0 ? originalSources : syllabusData.rawSources || [];

  const toggleSourceContent = (index: number) => {
    const newExpanded = new Set(expandedSourceContent);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSourceContent(newExpanded);
  };

  const contentSource = determineContentSource({
    fromCache: useCache,
    isAdHoc: syllabusData.isAdHoc,
    isAIEnhanced: aiStatus === 'ready' || syllabusData.isAIEnhanced,
    source: syllabusData.source
  });

  const handleAddToSources = async (authority: NonNullable<typeof syllabusData.discoveredAuthorities>[0]) => {
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
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('custom_sources')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentSources = (profile?.custom_sources as Array<{name: string, url: string, type: string}>) || [];
      
      if (currentSources.some(s => s.url.includes(authority.domain))) {
        toast({
          title: "Already added",
          description: `${authority.name} is already in your sources.`
        });
        setAddedAuthorities(prev => new Set([...prev, authority.domain]));
        setAddingAuthority(null);
        return;
      }

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
    <div className="space-y-6 max-w-3xl">
      {/* Provenance Overview */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold mb-4">Content Provenance</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <ProvenanceBadge source={contentSource} size="lg" />
          {sourcesToDisplay.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Built from {sourcesToDisplay.length} academic source{sourcesToDisplay.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Source Selection */}
      {sourcesToDisplay.length > 0 && (
        <div className="border rounded-lg bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
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
                  'Regenerate with Selected'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Select which sources to include in syllabus generation
            </p>
          </div>

          <div className="divide-y">
            {sourcesToDisplay.map((source, idx) => {
              const usageCount = syllabusData.modules.filter(m => {
                const urls = m.sourceUrls || (m.sourceUrl ? [m.sourceUrl] : []);
                return urls.includes(source.url);
              }).length;
              
              return (
                <div key={idx} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedSources.has(idx)}
                      onCheckedChange={() => toggleSourceSelection(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium border", getSourceColorByUrl(source.url))}
                        >
                          {getDomainShortName(source.url)}
                        </Badge>
                        <span className="font-medium text-sm">{source.institution}</span>
                        {usageCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            • {usageCount} module{usageCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{source.courseName}</p>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View source
                      </a>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  <Collapsible 
                    open={expandedSourceContent.has(idx)} 
                    onOpenChange={() => toggleSourceContent(idx)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full mt-3 pt-3 border-t flex items-center justify-between hover:text-foreground transition-colors text-sm text-muted-foreground">
                        <span>View Original Content</span>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          expandedSourceContent.has(idx) && "rotate-180"
                        )} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 p-3 bg-muted/30 rounded max-h-64 overflow-y-auto">
                        {source.content && source.content !== '[[EXTRACTION_FAILED]]' ? (
                          <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono">
                            {source.content}
                          </pre>
                        ) : (
                          <div className="text-sm text-muted-foreground space-y-2">
                            <p className="italic">Original content could not be extracted.</p>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View original source
                            </a>
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
      )}

      {/* Discovered Authorities */}
      {showAIContent && syllabusData.discoveredAuthorities && syllabusData.discoveredAuthorities.length > 0 && (
        <div className="p-6 border-2 border-dashed border-[hsl(var(--gold))]/30 rounded-lg bg-[hsl(var(--gold))]/5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-[hsl(var(--gold))]" />
            <h3 className="font-semibold">Discovered Authorities</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Industry leaders identified as authoritative for "{discipline}". 
            Add them to your sources for future searches.
          </p>
          <div className="space-y-3">
            {syllabusData.discoveredAuthorities.map((auth, idx) => (
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
      )}
    </div>
  );
}
