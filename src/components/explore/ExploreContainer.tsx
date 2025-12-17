import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DomainCarousel } from "./DomainCarousel";
import { SubDomainCarousel } from "./SubDomainCarousel";
import { SpecializationCarousel } from "./SpecializationCarousel";
import { ExploreBreadcrumb } from "./ExploreBreadcrumb";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Check } from "lucide-react";
import { useCommuniySyllabus } from "@/hooks/useCommuniySyllabus";
import { PreGenerationConstraints } from "@/components/PreGenerationSettings";
import { supabase } from "@/integrations/supabase/client";

interface ExploreState {
  selectedDomain?: string;
  selectedSubDomain?: string;
  selectedSpecialization?: string;
}

interface ExploreContainerProps {
  initialPath?: string[];
  globalConstraints: PreGenerationConstraints;
}

export const ExploreContainer = ({ initialPath, globalConstraints }: ExploreContainerProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<ExploreState>({});
  const [hasL3, setHasL3] = useState<boolean | null>(null);

  // Determine the deepest selected discipline for cache checking
  const selectedDiscipline = state.selectedSpecialization || state.selectedSubDomain || state.selectedDomain || '';
  const { cachedSyllabus, isLoading: cacheLoading, cacheDate, sourceCount } = useCommuniySyllabus(selectedDiscipline);

  // Initialize from path if provided
  useEffect(() => {
    if (initialPath && initialPath.length > 0) {
      setState({
        selectedDomain: initialPath[0],
        selectedSubDomain: initialPath[1],
        selectedSpecialization: initialPath[2],
      });
    }
  }, [initialPath]);

  // Check if selected subdomain has L3 children
  useEffect(() => {
    if (state.selectedDomain && state.selectedSubDomain) {
      checkForL3(state.selectedDomain, state.selectedSubDomain);
    } else {
      setHasL3(null);
    }
  }, [state.selectedDomain, state.selectedSubDomain]);

  const checkForL3 = async (domain: string, subDomain: string) => {
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("l3")
        .eq("l1", domain)
        .eq("l2", subDomain)
        .not("l3", "is", null)
        .limit(1);

      if (error) throw error;
      setHasL3(data && data.length > 0);
    } catch (error) {
      console.error("Error checking L3:", error);
      setHasL3(false);
    }
  };

  const handleDomainSelect = (domain: string) => {
    setState({
      selectedDomain: domain,
      selectedSubDomain: undefined,
      selectedSpecialization: undefined,
    });
    setHasL3(null);
  };

  const handleSubDomainSelect = (subDomain: string, hasChildren: boolean) => {
    setState(prev => ({
      ...prev,
      selectedSubDomain: subDomain,
      selectedSpecialization: undefined,
    }));
  };

  const handleSpecializationSelect = (specialization: string) => {
    setState(prev => ({
      ...prev,
      selectedSpecialization: specialization,
    }));
  };

  const clearDomain = () => {
    setState({});
    setHasL3(null);
  };

  const clearSubDomain = () => {
    setState(prev => ({
      selectedDomain: prev.selectedDomain,
      selectedSubDomain: undefined,
      selectedSpecialization: undefined,
    }));
    setHasL3(null);
  };

  const clearSpecialization = () => {
    setState(prev => ({
      ...prev,
      selectedSpecialization: undefined,
    }));
  };

  // Build full path for navigation
  const getFullPath = () => {
    const parts = [];
    if (state.selectedDomain) parts.push(state.selectedDomain);
    if (state.selectedSubDomain) parts.push(state.selectedSubDomain);
    if (state.selectedSpecialization) parts.push(state.selectedSpecialization);
    return parts.join(' > ');
  };

  // Determine if CTA should be enabled
  const canGenerate = () => {
    if (!state.selectedDomain) return false;
    if (!state.selectedSubDomain) return true; // Can generate at domain level if no subdomain selected
    if (hasL3 === false) return true; // No L3, can generate at L2
    if (hasL3 && !state.selectedSpecialization) return false; // Has L3, need to select
    return true;
  };

  const handleGenerate = (useAIEnhanced: boolean = false) => {
    const discipline = state.selectedSpecialization || state.selectedSubDomain || state.selectedDomain;
    if (!discipline) return;

    const params = new URLSearchParams({
      discipline,
      path: getFullPath(),
      depth: globalConstraints.depth,
      hoursPerWeek: globalConstraints.hoursPerWeek.toString(),
      skillLevel: globalConstraints.skillLevel,
    });

    if (globalConstraints.goalDate) {
      params.set('goalDate', globalConstraints.goalDate.toISOString());
    }

    if (useAIEnhanced) {
      params.set('useAIEnhanced', 'true');
    }

    if (cachedSyllabus && !useAIEnhanced) {
      params.set('useCache', 'true');
    }

    navigate(`/syllabus?${params.toString()}`);
  };

  const handleLoadCached = () => {
    const discipline = state.selectedSpecialization || state.selectedSubDomain || state.selectedDomain;
    if (!discipline) return;

    navigate(`/syllabus?useCache=true&discipline=${encodeURIComponent(discipline)}&path=${encodeURIComponent(getFullPath())}`);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <ExploreBreadcrumb
        domain={state.selectedDomain}
        subDomain={state.selectedSubDomain}
        specialization={state.selectedSpecialization}
        onClearDomain={clearDomain}
        onClearSubDomain={clearSubDomain}
        onClearSpecialization={clearSpecialization}
      />

      {/* Layer 1: Domains */}
      <DomainCarousel
        selectedDomain={state.selectedDomain}
        onSelect={handleDomainSelect}
      />

      {/* Layer 2: Sub-Domains */}
      {state.selectedDomain && (
        <SubDomainCarousel
          domain={state.selectedDomain}
          selectedSubDomain={state.selectedSubDomain}
          onSelect={handleSubDomainSelect}
        />
      )}

      {/* Layer 3: Specializations */}
      {state.selectedDomain && state.selectedSubDomain && hasL3 && (
        <SpecializationCarousel
          domain={state.selectedDomain}
          subDomain={state.selectedSubDomain}
          selectedSpecialization={state.selectedSpecialization}
          onSelect={handleSpecializationSelect}
        />
      )}

      {/* CTA Section */}
      {canGenerate() && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 bg-card border rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Selected discipline:</p>
              <p className="font-semibold text-lg">{getFullPath()}</p>
              {cachedSyllabus && cacheDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cached {cacheDate} • {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {cachedSyllabus ? (
                <>
                  <Button onClick={handleLoadCached} className="gap-2" disabled={cacheLoading}>
                    <Check className="h-4 w-4" />
                    Load Cached
                  </Button>
                  <Button onClick={() => handleGenerate(false)} variant="outline" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Traditional
                  </Button>
                  <Button 
                    onClick={() => handleGenerate(true)} 
                    variant="outline" 
                    className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI-Enhanced
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => handleGenerate(false)} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Traditional
                  </Button>
                  <Button 
                    onClick={() => handleGenerate(true)} 
                    variant="outline" 
                    className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI-Enhanced
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
