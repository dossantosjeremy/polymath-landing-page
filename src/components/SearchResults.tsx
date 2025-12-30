import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, Sparkles, Building2, Search, Zap, Bot, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCommuniySyllabus } from "@/hooks/useCommuniySyllabus";
import { PreGenerationConstraints } from "@/components/PreGenerationSettings";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Discipline {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
  match_type?: 'exact' | 'fuzzy' | 'prefix' | 'ai';
  similarity_score?: number;
  rationale?: string;
}

interface SearchResultsProps {
  results: Discipline[];
  query: string;
  searching: boolean;
  hasSearched: boolean;
  onBrowseInContext: (discipline: Discipline) => void;
  globalConstraints: PreGenerationConstraints;
}

export const SearchResults = ({
  results,
  query,
  searching,
  hasSearched,
  onBrowseInContext,
  globalConstraints
}: SearchResultsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [includeAIAugmentation, setIncludeAIAugmentation] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiResults, setAiResults] = useState<Discipline[]>([]);

  // Combine original results with AI results
  const allResults = [...results, ...aiResults];

  // Check cache for expanded discipline
  const expandedDiscipline = allResults.find(r => r.id === expandedId);
  const expandedDisciplineName = expandedDiscipline ? getLastLevel(expandedDiscipline) : '';
  const {
    cachedSyllabus,
    cacheDate,
    sourceCount
  } = useCommuniySyllabus(expandedDisciplineName);

  // Separate exact, prefix (word-start), fuzzy, and AI matches
  const exactMatches = allResults.filter(r => r.match_type === 'exact' || !r.match_type);
  const prefixMatches = allResults.filter(r => r.match_type === 'prefix');
  const fuzzyMatches = allResults.filter(r => r.match_type === 'fuzzy');
  const aiMatchResults = allResults.filter(r => r.match_type === 'ai');
  const similarMatches = [...prefixMatches, ...fuzzyMatches, ...aiMatchResults];
  const hasAnyMatches = allResults.length > 0;
  const hasOnlyFuzzyMatches = exactMatches.length === 0 && similarMatches.length > 0;

  const getDisciplinePath = (discipline: Discipline): string[] => {
    const path = [discipline.l1];
    if (discipline.l2) path.push(discipline.l2);
    if (discipline.l3) path.push(discipline.l3);
    if (discipline.l4) path.push(discipline.l4);
    if (discipline.l5) path.push(discipline.l5);
    if (discipline.l6) path.push(discipline.l6);
    return path;
  };

  const getLevel = (discipline: Discipline): string => {
    if (discipline.l6) return `${t('explore.level')} 6`;
    if (discipline.l5) return `${t('explore.level')} 5`;
    if (discipline.l4) return `${t('explore.level')} 4`;
    if (discipline.l3) return t('explore.subDomain');
    if (discipline.l2) return t('explore.category');
    return t('explore.domain');
  };

  function getLastLevel(discipline: Discipline): string {
    return discipline.l6 || discipline.l5 || discipline.l4 || discipline.l3 || discipline.l2 || discipline.l1;
  }

  const handleLoadSyllabus = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    const params = new URLSearchParams({
      discipline: disciplineName,
      path: path,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel
    });
    
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    
    if (cachedSyllabus && !includeAIAugmentation) {
      params.set('useCache', 'true');
    }
    
    if (includeAIAugmentation) {
      params.set('useAIEnhanced', 'true');
    }
    
    navigate(`/syllabus?${params.toString()}`);
  };

  const handleGenerateFresh = (discipline: Discipline) => {
    const disciplineName = getLastLevel(discipline);
    const path = getDisciplinePath(discipline).join(" > ");
    const params = new URLSearchParams({
      discipline: disciplineName,
      path: path,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel,
      forceRefresh: 'true',
    });
    
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    
    if (includeAIAugmentation) {
      params.set('useAIEnhanced', 'true');
    }
    
    navigate(`/syllabus?${params.toString()}`);
  };

  const handleAISearch = () => {
    const params = new URLSearchParams({
      discipline: query,
      isAdHoc: 'true',
      searchTerm: query,
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel
    });
    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }
    navigate(`/syllabus?${params.toString()}`);
  };

  // AI catalog matching function
  const handleAICatalogMatch = async () => {
    setAiMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-match-discipline', {
        body: { query, limit: 10 }
      });

      if (error) {
        console.error('AI matching error:', error);
        toast.error(t('toasts.aiMatchingUnavailable'));
        return;
      }

      if (data?.matches && data.matches.length > 0) {
        const existingIds = new Set(results.map(r => r.id));
        const newMatches = data.matches.filter((m: Discipline) => !existingIds.has(m.id));
        setAiResults(newMatches);
        
        if (newMatches.length > 0) {
          toast.success(t('toasts.foundMatches', { count: newMatches.length }));
        } else {
          toast.info(t('toasts.noAdditionalMatches'));
        }
      } else {
        toast.info(t('toasts.noMatchingDisciplines'));
      }
    } catch (err) {
      console.error('AI matching failed:', err);
      toast.error(t('toasts.failedToMatch'));
    } finally {
      setAiMatching(false);
    }
  };

  if (searching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (results.length === 0 && aiResults.length === 0 && !aiMatching && hasSearched) {
    return (
      <div className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-bold mb-2">{t('common.searching')}</h2>
          <p className="text-muted-foreground">
            {t('explore.resultsFor', { count: 0, query })}
          </p>
        </div>
      </div>
    );
  }

  if (aiMatching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">{t('common.searching')}</span>
      </div>
    );
  }

  const renderDisciplineCard = (discipline: Discipline, showFuzzyBadge: boolean = false) => {
    const path = getDisciplinePath(discipline);
    const level = getLevel(discipline);
    const isExpanded = expandedId === discipline.id;
    const similarityPercent = discipline.similarity_score ? Math.round(discipline.similarity_score * 100) : null;
    
    return (
      <Card 
        key={discipline.id} 
        className="hover:shadow-md transition-shadow cursor-pointer group" 
        onClick={() => {
          setExpandedId(isExpanded ? null : discipline.id);
          setIncludeAIAugmentation(false);
        }}
      >
        <CardContent className="pt-6 rounded-sm">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-1 bg-accent text-accent-foreground rounded-full">
                  {level}
                </span>
                {showFuzzyBadge && similarityPercent && (
                  <Badge variant="outline" className="text-xs">
                    {t('common.percentMatch', { percent: similarityPercent })}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {path.map((segment, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className={index === path.length - 1 ? "font-semibold" : "text-muted-foreground"}>
                      {segment}
                    </span>
                    {index < path.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>

          {isExpanded && (
            <div className="flex flex-col gap-4 mt-4" onClick={e => e.stopPropagation()}>
              {cachedSyllabus && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <ProvenanceBadge source="database" size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {t('explore.cached', { date: cacheDate })} • {t('explore.source', { count: sourceCount })}
                  </span>
                </div>
              )}

              <Button 
                onClick={() => handleLoadSyllabus(discipline)} 
                className="w-full"
                size="lg"
              >
                <Building2 className="mr-2 h-4 w-4" />
                {cachedSyllabus ? t('explore.loadAcademicSyllabus') : t('explore.generateAcademicSyllabus')}
              </Button>

              <label 
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Checkbox 
                  checked={includeAIAugmentation}
                  onCheckedChange={(checked) => setIncludeAIAugmentation(!!checked)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span className="font-medium text-sm">{t('explore.includeAIAugmentation')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('explore.aiAugmentationDesc')}
                  </p>
                </div>
              </label>

              <div className="flex gap-2">
                {cachedSyllabus && (
                  <Button 
                    onClick={() => handleGenerateFresh(discipline)} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    <BookOpen className="mr-2 h-3 w-3" />
                    {t('explore.generateFresh')}
                  </Button>
                )}
                <Button 
                  onClick={() => onBrowseInContext(discipline)} 
                  variant="ghost" 
                  size="sm"
                  className={cachedSyllabus ? 'flex-1' : 'w-full'}
                >
                  {t('explore.browseInContext')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-2">
        {t('explore.searchResults')}
      </h2>
      <p className="text-muted-foreground mb-6">
        {t('explore.resultsFor', { count: allResults.length, query })}
      </p>

      <div className="space-y-6">
        {exactMatches.length > 0 && (
          <div className="space-y-4">
            {similarMatches.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Search className="h-4 w-4" />
                <span>{t('explore.exactMatches')}</span>
                <Badge variant="secondary" className="ml-1">{exactMatches.length}</Badge>
              </div>
            )}
            <div className="grid gap-4">
              {exactMatches.map(discipline => renderDisciplineCard(discipline, false))}
            </div>
          </div>
        )}

        {(prefixMatches.length > 0 || fuzzyMatches.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>{hasOnlyFuzzyMatches ? t('explore.closestMatches') : t('explore.similarMatches')}</span>
              <Badge variant="outline" className="ml-1">{prefixMatches.length + fuzzyMatches.length}</Badge>
            </div>
            <div className="grid gap-4">
              {[...prefixMatches, ...fuzzyMatches].map(discipline => renderDisciplineCard(discipline, true))}
            </div>
          </div>
        )}

        {aiMatchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Bot className="h-4 w-4" />
              <span>{t('explore.aiMatched')}</span>
              <Badge variant="default" className="ml-1">{aiMatchResults.length}</Badge>
            </div>
            <div className="grid gap-4">
              {aiMatchResults.map(discipline => renderDisciplineCard(discipline, true))}
            </div>
          </div>
        )}

        {hasAnyMatches && (
          <div className="mt-8 p-4 border border-dashed rounded-lg bg-muted/30">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{t('explore.lookingElse')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasOnlyFuzzyMatches 
                    ? t('explore.noExactMatch', { query })
                    : t('explore.generateCustom', { query })
                  }
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {aiResults.length === 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAICatalogMatch}
                    disabled={aiMatching}
                  >
                    {aiMatching ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Bot className="mr-2 h-3 w-3" />
                    )}
                    {t('explore.matchCatalog')}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAISearch}
                >
                  <Sparkles className="mr-2 h-3 w-3" />
                  {t('explore.searchWeb')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
