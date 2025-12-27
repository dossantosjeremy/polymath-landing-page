import { useState, useEffect } from 'react';
import { ExternalLink, GraduationCap, AlertTriangle, PlusCircle, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResourceFallback } from './ResourceFallback';
import { useFindMoreResource } from '@/hooks/useFindMoreResource';
import { useToast } from '@/hooks/use-toast';

interface MOOC {
  type?: 'video' | 'text' | 'lesson' | 'exercise';
  url: string;
  title: string;
  source: string;          // Provider name
  duration?: string;
  verified?: boolean;
  archivedUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  author?: string;
  // Atomic resource fields
  course_title?: string;   // Parent course name
  course_url?: string;     // Course landing page
  authority_level?: 'academic' | 'professional' | 'community';
  is_atomic?: boolean;     // true = direct lesson, false = course fallback
  // Legacy field (deprecated)
  courseName?: string;
}

interface MOOCSectionProps {
  moocs: MOOC[];
  stepTitle: string;
  discipline: string;
  isLoading?: boolean;
  onFindMore?: () => void;
}

export const MOOCSection = ({ moocs, stepTitle, discipline, isLoading = false, onFindMore }: MOOCSectionProps) => {
  const [localMOOCs, setLocalMOOCs] = useState(moocs);
  const { findMore, isSearching } = useFindMoreResource();
  const { toast } = useToast();

  // Debug logging
  console.log('📚 MOOCSection render:', { moocCount: moocs?.length, isLoading, moocs });

  // Sync local state when props change
  useEffect(() => {
    setLocalMOOCs(moocs);
  }, [moocs]);
  
  // Show courses even if they're unverified (some providers block HEAD checks)
  const validMOOCs = localMOOCs.filter(m => m.url);
  
  // Group MOOCs by source
  const courseraMOOCs = validMOOCs.filter(m => m.source?.toLowerCase().includes('coursera'));
  const udemyMOOCs = validMOOCs.filter(m => m.source?.toLowerCase().includes('udemy'));
  const otherMOOCs = validMOOCs.filter(m => 
    !m.source?.toLowerCase().includes('coursera') && 
    !m.source?.toLowerCase().includes('udemy')
  );

  const handleFindMore = async () => {
    try {
      const existingUrls = localMOOCs.map(m => m.url);
      const result = await findMore('mooc', stepTitle, discipline, existingUrls);
      
      if (result?.error) {
        toast({
          title: "No New Courses Found",
          description: result.message || "Could not find additional courses.",
          variant: "default"
        });
        return;
      }
      
      if (result) {
        setLocalMOOCs([...localMOOCs, result]);
        toast({
          title: "Course Added",
          description: `Added: ${result.title}`,
        });
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: "Could not find additional courses. Try again later.",
        variant: "destructive"
      });
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const s = source?.toLowerCase() || '';
    // Use design-system tokens (no hardcoded Tailwind colors)
    if (s.includes('coursera')) return 'bg-primary text-primary-foreground';
    if (s.includes('udemy')) return 'bg-secondary text-secondary-foreground';
    if (s.includes('edx')) return 'bg-accent text-accent-foreground';
    if (s.includes('khan')) return 'bg-green-600 text-white';
    if (s.includes('linkedin')) return 'bg-blue-600 text-white';
    if (s.includes('skillshare')) return 'bg-emerald-600 text-white';
    if (s.includes('masterclass')) return 'bg-foreground text-background';
    if (s.includes('brilliant')) return 'bg-orange-500 text-white';
    if (s.includes('futurelearn')) return 'bg-purple-600 text-white';
    if (s.includes('mit') || s.includes('ocw')) return 'bg-red-700 text-white';
    return 'bg-muted text-muted-foreground';
  };

  // Pricing info per provider
  const getPricingInfo = (source: string): { label: string; class: string; note: string } => {
    const s = source?.toLowerCase() || '';
    if (s.includes('khan') || s.includes('mit') || s.includes('ocw')) {
      return { label: 'Free', class: 'bg-green-500/10 text-green-700 border-green-500/20', note: 'Always free' };
    }
    if (s.includes('coursera')) {
      return { label: 'Audit Free', class: 'bg-blue-500/10 text-blue-700 border-blue-500/20', note: 'Free to audit, paid for certificate' };
    }
    if (s.includes('edx')) {
      return { label: 'Audit Free', class: 'bg-blue-500/10 text-blue-700 border-blue-500/20', note: 'Free to audit, paid for verified certificate' };
    }
    if (s.includes('linkedin')) {
      return { label: 'Subscription', class: 'bg-amber-500/10 text-amber-700 border-amber-500/20', note: 'LinkedIn Learning subscription required' };
    }
    if (s.includes('skillshare')) {
      return { label: 'Subscription', class: 'bg-amber-500/10 text-amber-700 border-amber-500/20', note: 'Skillshare Premium required' };
    }
    if (s.includes('masterclass')) {
      return { label: 'Subscription', class: 'bg-amber-500/10 text-amber-700 border-amber-500/20', note: 'MasterClass membership required' };
    }
    if (s.includes('udemy')) {
      return { label: 'Paid', class: 'bg-orange-500/10 text-orange-700 border-orange-500/20', note: 'Individual course purchase' };
    }
    if (s.includes('brilliant')) {
      return { label: 'Freemium', class: 'bg-purple-500/10 text-purple-700 border-purple-500/20', note: 'Limited free content, Premium for full access' };
    }
    if (s.includes('futurelearn')) {
      return { label: 'Freemium', class: 'bg-purple-500/10 text-purple-700 border-purple-500/20', note: 'Free limited access, Unlimited for full' };
    }
    return { label: 'Check', class: 'bg-muted text-muted-foreground border-border', note: 'Check provider for pricing' };
  };

  const getAuthorityBadge = (level?: string) => {
    if (!level) return null;
    if (level === 'academic') return { label: 'Academic', class: 'bg-primary/10 text-primary border-primary/20' };
    if (level === 'professional') return { label: 'Professional', class: 'bg-secondary/10 text-secondary-foreground border-secondary/20' };
    return { label: 'Community', class: 'bg-muted text-muted-foreground border-border' };
  };

  // Get parent course name (supports both new and legacy fields)
  const getParentCourse = (mooc: MOOC) => mooc.course_title || mooc.courseName;

  const renderMOOCCard = (mooc: MOOC, index: number) => {
    const parentCourse = getParentCourse(mooc);
    const authorityBadge = getAuthorityBadge(mooc.authority_level);
    const isAtomicLesson = mooc.is_atomic === true;
    const isCourseFallback = mooc.is_atomic === false;
    const pricingInfo = getPricingInfo(mooc.source);
    const isCoursera = mooc.source?.toLowerCase().includes('coursera');

    return (
      <Card key={index} className={`border-2 p-3 sm:p-5 space-y-3 sm:space-y-4 h-full w-full max-w-full overflow-hidden ${isCourseFallback ? 'border-dashed border-muted-foreground/50' : 'border-border'}`}>
        {/* Thumbnail */}
        {mooc.thumbnailUrl && (
          <div className="aspect-video rounded-md overflow-hidden bg-muted">
            <img 
              src={mooc.thumbnailUrl} 
              alt={mooc.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Header with badges */}
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={`${getSourceBadgeColor(mooc.source)} w-fit text-xs`}>
              {mooc.source}
            </Badge>
            {/* Pricing badge */}
            <Badge variant="outline" className={`${pricingInfo.class} text-[10px] w-fit`} title={pricingInfo.note}>
              {pricingInfo.label}
            </Badge>
            {authorityBadge && (
              <Badge variant="outline" className={`${authorityBadge.class} text-[10px] w-fit`}>
                {authorityBadge.label}
              </Badge>
            )}
            {isAtomicLesson && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px] w-fit">
                Lesson
              </Badge>
            )}
            {mooc.verified === false && (
              <Badge variant="outline" className="text-[10px] w-fit">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                Unverified
              </Badge>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 break-words">{mooc.title}</h3>
          
          {/* Parent course attribution */}
          {parentCourse && (
            <p className="text-xs text-muted-foreground break-words">
              From{' '}
              {mooc.course_url ? (
                <a 
                  href={mooc.course_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {parentCourse}
                </a>
              ) : (
                <span className="font-medium">{parentCourse}</span>
              )}
            </p>
          )}
          
          {mooc.author && (
            <p className="text-xs text-muted-foreground break-words">by {mooc.author}</p>
          )}
          {mooc.duration && (
            <p className="text-xs text-muted-foreground">{mooc.duration}</p>
          )}
        </div>

        {/* Coursera-specific enrollment guidance */}
        {isCoursera && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-2 text-xs border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-700 dark:text-blue-400">
              💡 To access for free:
            </p>
            <ol className="text-blue-600 dark:text-blue-500 mt-1 list-decimal list-inside space-y-0.5">
              <li>Click "Enroll for Free"</li>
              <li>Look for "Audit this course" link at bottom</li>
              <li>Navigate to the specific lesson</li>
            </ol>
          </div>
        )}

        {/* Course fallback warning with search tip */}
        {isCourseFallback && !isCoursera && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-2 text-xs border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-medium">Full course</span>
            </div>
            <p className="text-amber-600 dark:text-amber-500 mt-1">
              💡 Search for "{stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim()}" within the course
            </p>
          </div>
        )}

        {mooc.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
            {mooc.description}
          </p>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-border">
          <Button
            size="sm"
            variant={isCourseFallback ? "outline" : "default"}
            className="w-full text-xs sm:text-sm"
            onClick={() => {
              // If not atomic, prefer course URL; otherwise use lesson URL
              const targetUrl = isCourseFallback 
                ? (mooc.course_url || mooc.url) 
                : mooc.url;
              window.open(targetUrl, '_blank');
            }}
          >
            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
            <span className="truncate">{isAtomicLesson ? 'Watch Lesson' : 'Browse Course'}</span>
          </Button>
        </div>

        {mooc.verified === false && (
          <ResourceFallback
            title={mooc.title}
            originalUrl={mooc.url}
            archivedUrl={mooc.archivedUrl}
            searchQuery={`${stepTitle} ${discipline} lesson`}
            resourceType="video"
          />
        )}
      </Card>
    );
  };

  const renderMOOCGroup = (groupMOOCs: MOOC[], label: string, badgeClass: string) => {
    if (groupMOOCs.length === 0) return null;
    
    return (
      <div className="space-y-3 w-full max-w-full">
        <div className="flex items-center gap-2">
          <Badge className={`${badgeClass} text-xs`}>{label}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground">{groupMOOCs.length} course{groupMOOCs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {groupMOOCs.map((mooc, idx) => renderMOOCCard(mooc, idx))}
        </div>
      </div>
    );
  };

  // Loading state - show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading online courses...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (validMOOCs.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        <Card className="p-4 sm:p-8 text-center border-dashed">
          <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="font-semibold mb-2 text-sm sm:text-base">No Online Courses Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            No online courses found for this topic. Try searching manually:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.coursera.org/search?query=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">Coursera</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.udemy.com/courses/search/?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">Udemy</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://www.edx.org/search?q=${encodeURIComponent(stepTitle)}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
              <span className="truncate">edX</span>
            </Button>
          </div>
        </Card>

        {/* Find More Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="sm"
            className="text-xs sm:text-sm"
            onClick={handleFindMore}
            disabled={isSearching}
          >
            <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
            {isSearching ? 'Searching...' : 'Search for Courses'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Coursera Section */}
      {renderMOOCGroup(courseraMOOCs, 'Coursera', 'bg-primary text-primary-foreground')}
      
      {/* Udemy Section */}
      {renderMOOCGroup(udemyMOOCs, 'Udemy', 'bg-secondary text-secondary-foreground')}
      
      {/* Other MOOCs */}
      {renderMOOCGroup(otherMOOCs, 'Other Platforms', 'bg-muted text-muted-foreground')}

      {/* Find More Button */}
      <div className="flex justify-center pt-2 sm:pt-4">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs sm:text-sm"
          onClick={handleFindMore}
          disabled={isSearching}
        >
          <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
          {isSearching ? 'Searching...' : 'Find More Courses'}
        </Button>
      </div>
    </div>
  );
};