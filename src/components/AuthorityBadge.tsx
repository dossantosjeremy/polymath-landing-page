import { Trophy, GraduationCap, Star, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AuthorityType = 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';

interface AuthorityBadgeProps {
  type: AuthorityType;
  reason?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const authorityConfig: Record<AuthorityType, {
  label: string;
  icon: typeof Trophy;
  emoji: string;
  className: string;
}> = {
  industry_standard: {
    label: 'Industry Standard',
    icon: Trophy,
    emoji: '🏆',
    className: 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30'
  },
  standard_body: {
    label: 'Standard Body',
    icon: FileText,
    emoji: '📋',
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300'
  },
  practitioner: {
    label: 'Elite Practitioner',
    icon: Star,
    emoji: '⭐',
    className: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300'
  },
  academic: {
    label: 'Academic',
    icon: GraduationCap,
    emoji: '🎓',
    className: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300'
  }
};

export function AuthorityBadge({ 
  type, 
  reason, 
  showLabel = true,
  size = 'sm',
  className 
}: AuthorityBadgeProps) {
  const config = authorityConfig[type] || authorityConfig.academic;
  const Icon = config.icon;
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0 h-5',
        size === 'md' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      <span className="mr-1">{config.emoji}</span>
      {showLabel && config.label}
    </Badge>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

// Compact version for inline use
export function AuthorityIndicator({ 
  type, 
  reason,
  className 
}: { 
  type: AuthorityType; 
  reason?: string;
  className?: string;
}) {
  const config = authorityConfig[type] || authorityConfig.academic;
  
  const indicator = (
    <span className={cn("text-xs cursor-help", className)}>
      {config.emoji}
    </span>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium text-sm mb-1">{config.label}</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}
