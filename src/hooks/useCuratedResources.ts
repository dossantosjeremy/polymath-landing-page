import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ResourceOrigin } from '@/components/TrustBadge';

export interface CuratedResource {
  url: string;
  title: string;
  author?: string;
  duration?: string;
  thumbnailUrl?: string;
  domain?: string;
  snippet?: string;
  embeddedContent?: string;
  type?: string;
  priority: 'mandatory' | 'optional_expansion';
  origin: ResourceOrigin;
  scoreBreakdown: {
    syllabusMatch: number;
    authorityMatch: number;
    atomicScope: number;
    total: number;
  };
  rationale: string;
  consumptionTime: string;
  coveragePercent?: number;
  verified?: boolean;
}

export interface CuratedStepResources {
  // Core resources (exactly 1 each, or null)
  coreVideo: CuratedResource | null;
  coreReading: CuratedResource | null;
  
  // Learning context
  learningObjective: string;
  totalCoreTime: string;
  totalExpandedTime: string;
  
  // Supplemental (optional)
  deepDive: CuratedResource[];
  expansionPack: CuratedResource[];
  
  // Knowledge verification
  knowledgeCheck?: {
    question: string;
    supplementalResourceId?: string;
  };
  
  // Legacy compatibility - for components that still use old format
  videos: CuratedResource[];
  readings: CuratedResource[];
  books: CuratedResource[];
  alternatives: CuratedResource[];
}

export const useCuratedResources = () => {
  const [resources, setResources] = useState<CuratedStepResources | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async (
    stepTitle: string, 
    discipline: string, 
    syllabusUrls: string[] = [],
    rawSourcesContent: string = '',
    userTimeBudget?: number,
    forceRefresh: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-step-resources', {
        body: { 
          stepTitle, 
          discipline, 
          syllabusUrls, 
          rawSourcesContent,
          userTimeBudget,
          forceRefresh,
          useCuratedFormat: true // Signal to use new curator format
        }
      });

      if (functionError) {
        throw functionError;
      }

      // Transform response to CuratedStepResources format
      const curatedResources = transformToCuratedFormat(data);
      setResources(curatedResources);
    } catch (err) {
      console.error('Error fetching curated resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      setResources(null);
    } finally {
      setIsLoading(false);
    }
  };

  const findMoreResources = async (
    stepTitle: string,
    discipline: string,
    type: 'video' | 'reading' | 'podcast',
    existingUrls: string[]
  ) => {
    const { data, error: functionError } = await supabase.functions.invoke('find-additional-resource', {
      body: { stepTitle, discipline, resourceType: type, existingUrls }
    });

    if (functionError) throw functionError;
    
    // Check if API returned an error message instead of resource
    if (data?.error) {
      throw new Error(data.error);
    }

    // Validate we have a proper resource with URL
    if (!data?.url) {
      throw new Error('No resource found');
    }

    if (resources) {
      // Add new resource to expansion pack
      const newResource: CuratedResource = {
        url: data.url,
        title: data.title || 'Untitled',
        author: data.author,
        duration: data.duration,
        thumbnailUrl: data.thumbnailUrl,
        domain: data.domain || extractDomain(data.url),
        snippet: data.snippet,
        type: type,
        priority: 'optional_expansion',
        origin: data.origin || 'ai_selected',
        scoreBreakdown: data.scoreBreakdown || {
          syllabusMatch: 0,
          authorityMatch: 0,
          atomicScope: 20,
          total: 20
        },
        rationale: data.rationale || data.whyThisVideo || data.focusHighlight || `Additional ${type} found via search`,
        consumptionTime: data.consumptionTime || data.duration || '10 mins',
        verified: data.verified
      };

      setResources({
        ...resources,
        expansionPack: [...resources.expansionPack, newResource]
      });

      return newResource;
    }
    
    return null;
  };

  return { 
    resources, 
    isLoading, 
    error, 
    fetchResources,
    findMoreResources 
  };
};

// Transform legacy format to curated format
function transformToCuratedFormat(data: any): CuratedStepResources {
  // If already in curated format, return as-is
  if (data.coreVideo !== undefined || data.learningObjective) {
    return {
      coreVideo: data.coreVideo || null,
      coreReading: data.coreReading || null,
      learningObjective: data.learningObjective || 'Complete this learning step to master the core concepts.',
      totalCoreTime: data.totalCoreTime || calculateTotalTime([data.coreVideo, data.coreReading].filter(Boolean)),
      totalExpandedTime: data.totalExpandedTime || calculateTotalTime([...(data.deepDive || []), ...(data.expansionPack || [])]),
      deepDive: data.deepDive || [],
      expansionPack: data.expansionPack || [],
      knowledgeCheck: data.knowledgeCheck,
      // Legacy compatibility
      videos: data.videos || [],
      readings: data.readings || [],
      books: data.books || [],
      alternatives: data.alternatives || []
    };
  }

  // Transform legacy format
  const videos = data.videos || [];
  const readings = data.readings || [];
  const books = data.books || [];
  const alternatives = data.alternatives || [];

  // Select core resources (highest quality/first verified)
  const coreVideo = selectCoreResource(videos, 'video');
  const coreReading = selectCoreResource(readings, 'reading');

  // Remaining resources go to expansion
  const remainingVideos = videos.filter((v: any) => v !== coreVideo);
  const remainingReadings = readings.filter((r: any) => r !== coreReading);

  // Deep dive: top 2-3 supplemental resources
  const deepDive = [
    ...remainingVideos.slice(0, 1).map((v: any) => transformResource(v, 'video')),
    ...remainingReadings.slice(0, 2).map((r: any) => transformResource(r, 'reading'))
  ];

  // Everything else in expansion pack
  const expansionPack = [
    ...remainingVideos.slice(1).map((v: any) => transformResource(v, 'video')),
    ...remainingReadings.slice(2).map((r: any) => transformResource(r, 'reading')),
    ...books.map((b: any) => transformResource(b, 'book')),
    ...alternatives.map((a: any) => transformResource(a, a.type || 'article'))
  ];

  return {
    coreVideo: coreVideo ? transformResource(coreVideo, 'video') : null,
    coreReading: coreReading ? transformResource(coreReading, 'reading') : null,
    learningObjective: 'By completing this step, you will understand the core concepts and be able to apply them.',
    totalCoreTime: calculateTotalTime([coreVideo, coreReading].filter(Boolean)),
    totalExpandedTime: calculateTotalTime([...deepDive, ...expansionPack]),
    deepDive,
    expansionPack,
    knowledgeCheck: {
      question: 'Can you explain the main concepts covered in this step?',
      supplementalResourceId: deepDive.length > 0 ? '0' : undefined
    },
    // Legacy compatibility
    videos,
    readings,
    books,
    alternatives
  };
}

function selectCoreResource(resources: any[], type: string): any | null {
  if (!resources || resources.length === 0) return null;
  
  // Prefer verified resources with syllabus_cited origin
  const verified = resources.filter(r => r.verified !== false);
  const syllabusCited = verified.filter(r => r.origin === 'syllabus_cited');
  const authorityDomain = verified.filter(r => r.origin === 'authority_domain');
  
  return syllabusCited[0] || authorityDomain[0] || verified[0] || resources[0];
}

function transformResource(resource: any, type: string): CuratedResource {
  return {
    url: resource.url || '',
    title: resource.title || '',
    author: resource.author,
    duration: resource.duration,
    thumbnailUrl: resource.thumbnailUrl,
    domain: resource.domain || extractDomain(resource.url),
    snippet: resource.snippet,
    type,
    priority: resource.priority || 'optional_expansion',
    origin: resource.origin || inferOrigin(resource),
    scoreBreakdown: resource.scoreBreakdown || {
      syllabusMatch: 0,
      authorityMatch: inferAuthorityScore(resource),
      atomicScope: 20,
      total: inferAuthorityScore(resource) + 20
    },
    rationale: resource.rationale || resource.whyThisVideo || resource.why || resource.focusHighlight || 'Selected for relevance',
    consumptionTime: resource.consumptionTime || resource.duration || '10 mins',
    coveragePercent: resource.coveragePercent,
    verified: resource.verified
  };
}

// Export for use in findMoreResources
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function inferOrigin(resource: any): ResourceOrigin {
  const domain = extractDomain(resource.url);
  const authorityDomains = [
    'nngroup.com', 'hbr.org', 'stanford.edu', 'mit.edu', 
    'harvard.edu', 'yale.edu', 'coursera.org', 'edx.org'
  ];
  
  if (authorityDomains.some(d => domain.includes(d))) {
    return 'authority_domain';
  }
  return 'ai_selected';
}

function inferAuthorityScore(resource: any): number {
  const domain = extractDomain(resource.url);
  const highAuthority = ['stanford.edu', 'mit.edu', 'harvard.edu', 'yale.edu'];
  const mediumAuthority = ['nngroup.com', 'hbr.org', 'coursera.org', 'edx.org'];
  
  if (highAuthority.some(d => domain.includes(d))) return 30;
  if (mediumAuthority.some(d => domain.includes(d))) return 20;
  return 0;
}

function calculateTotalTime(resources: any[]): string {
  let totalMinutes = 0;
  
  for (const r of resources) {
    if (!r) continue;
    const time = r.consumptionTime || r.duration || '';
    const mins = parseInt(time.match(/(\d+)/)?.[1] || '10');
    totalMinutes += mins;
  }
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${totalMinutes} mins`;
}
