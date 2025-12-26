import { Sparkles, Globe, BookMarked, ChevronRight, Layers, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AuthorityBadge, AuthorityType } from '@/components/AuthorityBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

export interface DomainAuthority {
  name: string;
  domain: string;
  authorityType: AuthorityType;
  authorityReason: string;
  focusAreas: string[];
}

interface AdHocHeaderProps {
  discipline: string;
  compositionType?: 'single' | 'composite_program' | 'vocational';
  derivedFrom?: string[];
  topicPillars?: TopicPillar[];
  narrativeFlow?: string;
  synthesisRationale?: string;
  sourceCount: number;
  sourceNames: string[];
  discoveredAuthorities?: DomainAuthority[];
}

// Icon mapping for pillars (based on common pillar names)
const getPillarIcon = (pillarName: string) => {
  const name = pillarName.toLowerCase();
  if (name.includes('foundation') || name.includes('basic') || name.includes('intro')) return '📚';
  if (name.includes('tool') || name.includes('method') || name.includes('framework')) return '🔧';
  if (name.includes('practice') || name.includes('application') || name.includes('execution')) return '⚡';
  if (name.includes('leadership') || name.includes('team') || name.includes('soft')) return '👥';
  if (name.includes('risk') || name.includes('management')) return '📊';
  if (name.includes('advanced') || name.includes('deep')) return '🎯';
  if (name.includes('strategy') || name.includes('business')) return '📈';
  if (name.includes('finance') || name.includes('accounting')) return '💰';
  if (name.includes('marketing') || name.includes('sales')) return '📣';
  if (name.includes('tech') || name.includes('software') || name.includes('code')) return '💻';
  return '📖';
};

// Color for pillar priority
const getPriorityColor = (priority: string) => {
  if (priority === 'core') return 'bg-primary/20 text-primary border-primary/30';
  if (priority === 'important') return 'bg-amber-500/20 text-amber-700 border-amber-300';
  return 'bg-muted text-muted-foreground border-muted';
};

export function AdHocHeader({
  discipline,
  compositionType = 'single',
  derivedFrom = [],
  topicPillars = [],
  narrativeFlow,
  synthesisRationale,
  sourceCount,
  sourceNames,
  discoveredAuthorities = []
}: AdHocHeaderProps) {
  const compositionLabel = compositionType === 'composite_program' 
    ? '🧩 Composite Program' 
    : compositionType === 'vocational' 
      ? '⚡ Vocational Track' 
      : '✨ Web Sourced';

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-[hsl(var(--gold))]/30">
      {/* Blueprint-style header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative">
        {/* Blueprint grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge className="bg-[hsl(var(--gold))] text-slate-900 mb-3 font-medium">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Synthesized Path
              </Badge>
              
              <h2 className="text-2xl font-bold mb-1">Custom Track: {discipline}</h2>
              <p className="text-slate-300 text-sm">
                Synthesized from {sourceCount} external source{sourceCount !== 1 ? 's' : ''} 
                {sourceNames.length > 0 && ` (${sourceNames.slice(0, 3).join(', ')}${sourceNames.length > 3 ? '...' : ''})`}
              </p>
              
              {/* Narrative flow description */}
              {narrativeFlow && (
                <p className="text-slate-300 text-xs mt-2 italic">
                  Learning Path: {narrativeFlow}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-md">
              <span className="text-sm font-medium">{compositionLabel}</span>
            </div>
          </div>
          
          {/* For composite programs, show the constituent disciplines */}
          {compositionType === 'composite_program' && derivedFrom && derivedFrom.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-400">Built from:</span>
              {derivedFrom.map((d, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white/10 border border-white/20 rounded"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* "TITANS" - Curriculum Authorities Section */}
      {discoveredAuthorities && discoveredAuthorities.length > 0 && (
        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-[hsl(var(--gold))]" />
            <span className="text-sm font-semibold text-white">Curriculum Authorities</span>
            <span className="text-xs text-slate-300">({discoveredAuthorities.length} industry leaders)</span>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            This curriculum was synthesized using standards from industry leaders
          </p>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {discoveredAuthorities.map((auth, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 rounded-full cursor-help hover:bg-slate-600 transition-colors border border-slate-600">
                      <AuthorityBadge type={auth.authorityType} showLabel={false} />
                      <span className="text-sm text-white">{auth.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">{auth.name}</p>
                    <p className="text-xs text-muted-foreground">{auth.authorityReason}</p>
                    {auth.focusAreas && auth.focusAreas.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Focus: {auth.focusAreas.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-blue-400 mt-1">{auth.domain}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}
      
      {/* Pillar "Ingredients" Section */}
      {topicPillars && topicPillars.length > 0 && (
        <div className="bg-card p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-[hsl(var(--gold))]" />
            <span className="text-sm font-semibold text-foreground">Curriculum Pillars</span>
            <span className="text-xs text-muted-foreground">({topicPillars.length} learning domains)</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {topicPillars.map((pillar, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
                  getPriorityColor(pillar.priority)
                )}
              >
                <span>{getPillarIcon(pillar.name)}</span>
                <span className="font-medium">{pillar.name}</span>
                {pillar.priority === 'core' && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Core</Badge>
                )}
              </div>
            ))}
          </div>
          
          {/* Synthesis rationale */}
          {synthesisRationale && (
            <p className="mt-3 text-xs text-muted-foreground italic border-t border-border pt-2">
              {synthesisRationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
