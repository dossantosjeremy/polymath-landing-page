import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ResourceOrigin = 'syllabus_cited' | 'authority_domain' | 'ai_selected';

interface TrustBadgeProps {
  origin: ResourceOrigin;
  domain?: string;
  discipline?: string;
  className?: string;
}

const originConfig = {
  syllabus_cited: {
    emoji: '🏛️',
    label: 'Syllabus Verified',
    tooltip: 'This resource is explicitly listed in the curriculum of MIT/Stanford',
    variant: 'gold' as const,
  },
  authority_domain: {
    emoji: '🏆',
    label: 'Industry Standard',
    tooltip: 'Sourced from a leading authority in the field',
    variant: 'silver' as const,
  },
  ai_selected: {
    emoji: '✨',
    label: 'AI Selected',
    tooltip: 'Selected for clarity and relevance by AI curator',
    variant: 'bronze' as const,
  },
};

export function TrustBadge({ origin, domain, discipline, className }: TrustBadgeProps) {
  const config = originConfig[origin] || originConfig.ai_selected;
  
  const tooltipText = origin === 'authority_domain' && domain
    ? `Sourced from ${domain}, a leading authority${discipline ? ` in ${discipline}` : ''}`
    : config.tooltip;

  const variantStyles = {
    gold: 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30',
    silver: 'bg-muted text-muted-foreground border-border',
    bronze: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              'text-xs font-medium cursor-help',
              variantStyles[config.variant],
              className
            )}
          >
            <span className="mr-1">{config.emoji}</span>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ScoreBreakdownBadgeProps {
  scoreBreakdown: {
    syllabusMatch: number;
    authorityMatch: number;
    atomicScope: number;
    total: number;
  };
  className?: string;
}

export function ScoreBreakdownBadge({ scoreBreakdown, className }: ScoreBreakdownBadgeProps) {
  const { syllabusMatch, authorityMatch, atomicScope, total } = scoreBreakdown;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              'text-xs font-mono cursor-help',
              total >= 70 ? 'bg-green-500/10 text-green-700 border-green-500/30' :
              total >= 40 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' :
              'bg-muted text-muted-foreground border-border',
              className
            )}
          >
            Score: {total}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium">Quality Score Breakdown:</p>
            <div className="grid grid-cols-2 gap-x-4">
              <span>Syllabus Match:</span>
              <span className="font-mono">{syllabusMatch} pts</span>
              <span>Authority Domain:</span>
              <span className="font-mono">{authorityMatch} pts</span>
              <span>Atomic Scope:</span>
              <span className="font-mono">{atomicScope} pts</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
