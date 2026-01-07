import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ResourceOrigin } from '@/components/TrustBadge';

import { LearningObjectGranularity, GranularityClassification } from '@/types/learningObjects';

// Epistemic classification for rule-based core selection
export interface EpistemicRole {
  isFoundational: boolean;
  isCanonical: boolean;
  isDistinctApproach: boolean;
  isPrerequisite: boolean;
  criteriaCount: number;
}

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
  verificationStatus?: 'verified' | 'unverified' | 'failed';
  epistemicRole?: EpistemicRole;
  whySecondary?: string;
  // NEW: Explicit granularity classification
  granularity?: LearningObjectGranularity;
  granularityConfidence?: 'high' | 'medium' | 'low';
  requiresDecomposition?: boolean;
}

// Excluded resource tracking for transparency
export interface ExcludedResource {
  resource: CuratedResource;
  reason: 'duplicate' | 'unverified' | 'low_relevance' | 'over_limit' | 'similar_to_core';
  originalScore: number;
}

// Availability report for transparency
export interface AvailabilityReport {
  videosFound: number;
  videosShownAsCore: number;
  readingsFound: number;
  readingsShownAsCore: number;
  wasLimitedByAvailability: boolean;
  message?: string;
}

export interface CuratedStepResources {
  // Multiple core resources (new)
  coreVideos: CuratedResource[];
  coreReadings: CuratedResource[];
  
  // Legacy single-core for backward compatibility
  coreVideo: CuratedResource | null;
  coreReading: CuratedResource | null;
  
  // Learning context
  learningObjective: string;
  totalCoreTime: string;
  totalExpandedTime: string;
  
  // Supplemental (optional)
  deepDive: CuratedResource[];
  expansionPack: CuratedResource[];
  
  // MOOCs - dedicated array for Online Courses tab
  moocs: any[];
  
  // Knowledge verification
  knowledgeCheck?: {
    question: string;
    supplementalResourceId?: string;
  };
  
  // Transparency: what was excluded and why
  excludedCore: ExcludedResource[];
  availabilityReport: AvailabilityReport;
  
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
  // Debug logging
  console.log('📥 Raw data received from backend:', {
    hasVideoField: !!data.videos,
    hasCoreVideos: !!data.coreVideos,
    coreVideosCount: data.coreVideos?.length || 0,
    coreReadingsCount: data.coreReadings?.length || 0,
    hasAlternatives: !!data.alternatives,
    alternativesCount: data.alternatives?.length || 0,
    hasMoocsField: !!data.moocs,
    moocsCount: data.moocs?.length || 0,
    hasAvailabilityReport: !!data.availabilityReport
  });

  // Extract MOOCs from alternatives
  const allAlternatives = data.alternatives || [];
  const moocs = data.moocs || allAlternatives.filter((a: any) => a.type === 'mooc');
  const nonMoocAlternatives = allAlternatives.filter((a: any) => a.type !== 'mooc');

  console.log('📚 Extracted MOOCs:', moocs.length, moocs.map((m: any) => m.title));

  // Default availability report
  const defaultAvailabilityReport: AvailabilityReport = {
    videosFound: 0,
    videosShownAsCore: 0,
    readingsFound: 0,
    readingsShownAsCore: 0,
    wasLimitedByAvailability: false
  };

  // If already in new multi-core format, return as-is with defaults filled
  if (data.coreVideos !== undefined || data.coreReadings !== undefined) {
    return {
      coreVideos: data.coreVideos || [],
      coreReadings: data.coreReadings || [],
      coreVideo: data.coreVideo || data.coreVideos?.[0] || null,
      coreReading: data.coreReading || data.coreReadings?.[0] || null,
      learningObjective: data.learningObjective || 'Complete this learning step to master the core concepts.',
      totalCoreTime: data.totalCoreTime || calculateTotalTime([...(data.coreVideos || []), ...(data.coreReadings || [])]),
      totalExpandedTime: data.totalExpandedTime || calculateTotalTime([...(data.deepDive || []), ...(data.expansionPack || [])]),
      deepDive: data.deepDive || [],
      expansionPack: data.expansionPack || [],
      moocs: moocs,
      knowledgeCheck: data.knowledgeCheck,
      excludedCore: data.excludedCore || [],
      availabilityReport: data.availabilityReport || defaultAvailabilityReport,
      // Legacy compatibility
      videos: data.videos || [],
      readings: data.readings || [],
      books: data.books || [],
      alternatives: nonMoocAlternatives
    };
  }

  // Handle legacy single-core format (coreVideo/coreReading)
  if (data.coreVideo !== undefined || data.learningObjective) {
    const coreVideos = data.coreVideo ? [data.coreVideo] : [];
    const coreReadings = data.coreReading ? [data.coreReading] : [];
    
    return {
      coreVideos,
      coreReadings,
      coreVideo: data.coreVideo || null,
      coreReading: data.coreReading || null,
      learningObjective: data.learningObjective || 'Complete this learning step to master the core concepts.',
      totalCoreTime: data.totalCoreTime || calculateTotalTime([data.coreVideo, data.coreReading].filter(Boolean)),
      totalExpandedTime: data.totalExpandedTime || calculateTotalTime([...(data.deepDive || []), ...(data.expansionPack || [])]),
      deepDive: data.deepDive || [],
      expansionPack: data.expansionPack || [],
      moocs: moocs,
      knowledgeCheck: data.knowledgeCheck,
      excludedCore: [],
      availabilityReport: {
        videosFound: (data.videos?.length || 0) + coreVideos.length,
        videosShownAsCore: coreVideos.length,
        readingsFound: (data.readings?.length || 0) + coreReadings.length,
        readingsShownAsCore: coreReadings.length,
        wasLimitedByAvailability: false
      },
      // Legacy compatibility
      videos: data.videos || [],
      readings: data.readings || [],
      books: data.books || [],
      alternatives: nonMoocAlternatives
    };
  }

  // Transform truly legacy format (no curated structure at all)
  const videos = data.videos || [];
  const readings = data.readings || [];
  const books = data.books || [];
  const alternatives = data.alternatives || [];

  // Select core resources (highest quality/first verified)
  const coreVideo = selectCoreResource(videos, 'video');
  const coreReading = selectCoreResource(readings, 'reading');
  const coreVideos = coreVideo ? [transformResource(coreVideo, 'video')] : [];
  const coreReadings = coreReading ? [transformResource(coreReading, 'reading')] : [];

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
    ...alternatives.filter((a: any) => a.type !== 'mooc').map((a: any) => transformResource(a, a.type || 'article'))
  ];

  // Extract MOOCs from alternatives
  const legacyMoocs = alternatives.filter((a: any) => a.type === 'mooc');
  const legacyNonMoocAlternatives = alternatives.filter((a: any) => a.type !== 'mooc');

  return {
    coreVideos,
    coreReadings,
    coreVideo: coreVideos[0] || null,
    coreReading: coreReadings[0] || null,
    learningObjective: 'By completing this step, you will understand the core concepts and be able to apply them.',
    totalCoreTime: calculateTotalTime([...coreVideos, ...coreReadings]),
    totalExpandedTime: calculateTotalTime([...deepDive, ...expansionPack]),
    deepDive,
    expansionPack,
    moocs: legacyMoocs,
    knowledgeCheck: {
      question: 'Can you explain the main concepts covered in this step?',
      supplementalResourceId: deepDive.length > 0 ? '0' : undefined
    },
    excludedCore: [],
    availabilityReport: {
      videosFound: videos.length,
      videosShownAsCore: coreVideos.length,
      readingsFound: readings.length,
      readingsShownAsCore: coreReadings.length,
      wasLimitedByAvailability: videos.length === 0 || readings.length === 0
    },
    // Legacy compatibility
    videos,
    readings,
    books,
    alternatives: legacyNonMoocAlternatives
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
    verified: resource.verified,
    epistemicRole: resource.epistemicRole,
    whySecondary: resource.whySecondary
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
