import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Authority domains for scoring
const AUTHORITY_DOMAINS: Record<string, { type: string; reason: string }> = {
  'nngroup.com': { type: 'industry_standard', reason: 'Nielsen Norman Group - UX authority' },
  'hbr.org': { type: 'industry_standard', reason: 'Harvard Business Review' },
  'stanford.edu': { type: 'academic', reason: 'Stanford University' },
  'plato.stanford.edu': { type: 'academic', reason: 'Stanford Encyclopedia of Philosophy' },
  'mit.edu': { type: 'academic', reason: 'MIT' },
  'ocw.mit.edu': { type: 'academic', reason: 'MIT OpenCourseWare' },
  'harvard.edu': { type: 'academic', reason: 'Harvard University' },
  'yale.edu': { type: 'academic', reason: 'Yale University' },
  'coursera.org': { type: 'academic', reason: 'Coursera - Top university courses' },
  'edx.org': { type: 'academic', reason: 'edX - University courses' },
  'khanacademy.org': { type: 'academic', reason: 'Khan Academy' },
  'investopedia.com': { type: 'industry_standard', reason: 'Finance authority' },
  'w3.org': { type: 'standard_body', reason: 'W3C Standards' },
  'iso.org': { type: 'standard_body', reason: 'ISO Standards' },
  'wikipedia.org': { type: 'academic', reason: 'Wikipedia - General reference' },
  'gutenberg.org': { type: 'academic', reason: 'Project Gutenberg - Public domain texts' },
  'archive.org': { type: 'academic', reason: 'Internet Archive' },
  'udemy.com': { type: 'industry_standard', reason: 'Udemy - Professional skills courses' },
};

// Helper to infer proper MOOC source name from URL
function inferMOOCSource(url: string, domain?: string): string {
  if (url.includes('coursera.org') || url.includes('coursera.com')) return 'Coursera';
  if (url.includes('udemy.com')) return 'Udemy';
  if (url.includes('edx.org')) return 'edX';
  if (url.includes('khanacademy.org')) return 'Khan Academy';
  if (url.includes('linkedin.com/learning')) return 'LinkedIn Learning';
  if (url.includes('skillshare.com')) return 'Skillshare';
  if (url.includes('pluralsight.com')) return 'Pluralsight';
  if (url.includes('udacity.com')) return 'Udacity';
  return domain || 'Online Course';
}

// Helper to sanitize malformed JSON from Perplexity responses
function sanitizeJSON(jsonString: string): string {
  return jsonString
    // Remove trailing commas before ] or }
    .replace(/,\s*([}\]])/g, '$1')
    // Fix unescaped newlines inside strings
    .replace(/[\n\r]/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Fix common quote issues (curly quotes to straight)
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Trim whitespace
    .trim();
}

// Atomic MOOC Resource interface - individual lessons, not full courses
interface AtomicMOOCResource {
  type: 'video' | 'text' | 'lesson' | 'exercise';
  title: string;           // Lesson/module title
  url: string;             // Direct lesson URL (or course URL if unavailable)
  provider: string;        // "Coursera" | "Udemy" | "Khan Academy" | etc.
  course_title: string;    // Parent course name
  course_url: string;      // Course landing page
  authority_level: 'academic' | 'professional' | 'community';
  duration?: string;       // Lesson duration (e.g., "15 mins")
  instructor?: string;
  description?: string;
  is_atomic: boolean;      // true = direct lesson, false = course fallback
}

// Search for ATOMIC learning units (individual lessons) from MOOC platforms
async function searchAtomicLearningUnits(stepTitle: string, discipline: string, blacklist: string[]): Promise<AtomicMOOCResource[]> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) {
    console.log('PERPLEXITY_API_KEY not configured, skipping atomic MOOC search');
    return [];
  }

  // Clean step title for better search results
  const cleanedTitle = stepTitle
    .replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '')
    .trim();
  
  console.log('🎓 Searching for ATOMIC learning units about:', cleanedTitle);

  const blacklistClause = blacklist.length > 0 
    ? `\nDO NOT return these URLs: ${blacklist.join(', ')}`
    : '';

  // STRICT ATOMIC CONSTRAINT PROMPT
  const prompt = `SEARCH for INDIVIDUAL LESSONS, VIDEOS, or MODULES (NOT full courses) about: "${cleanedTitle}" in ${discipline}

CRITICAL CONSTRAINT:
- Select ONLY atomic learning units that directly match this SPECIFIC topic
- DO NOT include full courses as primary resources
- Each resource must be a SINGLE lesson, video, or reading (under 30 minutes)

Preferred sources (in order):
1. Coursera individual lectures: coursera.org/learn/COURSE/lecture/...
2. edX specific modules/videos: edx.org/course/.../video/...
3. Khan Academy individual videos: khanacademy.org/.../v/...
4. LinkedIn Learning individual videos: linkedin.com/learning/.../lesson/...
5. YouTube videos from official course channels

For EACH resource, you MUST find:
- The SPECIFIC lesson/video URL (not the course landing page)
- The parent course name (for attribution)
- The estimated duration (prefer under 20 minutes)

HARD LIMITS:
- Max 2 resources TOTAL
- Max 1 resource per provider
- Prefer content under 20 minutes

If a URL points to a full course landing page (not a specific lesson), mark is_atomic: false.
${blacklistClause}

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "type": "video",
    "title": "Specific lesson title",
    "url": "direct lesson URL",
    "provider": "Coursera",
    "course_title": "Parent Course Name",
    "course_url": "course landing page URL",
    "authority_level": "academic",
    "duration": "12 mins",
    "instructor": "Instructor Name",
    "description": "What this specific lesson covers",
    "is_atomic": true
  }
]`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a learning resource discovery assistant specialized in finding INDIVIDUAL lessons and videos, NOT full courses. Return ONLY valid JSON arrays, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('Perplexity atomic MOOC search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Log raw response for debugging
    console.log('Atomic MOOC search raw response (first 500 chars):', content.substring(0, 500));
    
    // Parse JSON from response with sanitization and fallback
    let lessons: AtomicMOOCResource[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        // First try direct parse
        try {
          lessons = JSON.parse(jsonMatch[0]);
        } catch (directParseError) {
          // Sanitize and retry
          console.log('Direct JSON parse failed, attempting sanitization...');
          const sanitized = sanitizeJSON(jsonMatch[0]);
          lessons = JSON.parse(sanitized);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse atomic lessons JSON after sanitization:', parseError);
      // Fallback: Try to extract individual objects
      console.log('Attempting individual object extraction from atomic response...');
      const objectMatches = content.matchAll(/\{[^{}]*"url"\s*:\s*"[^"]+[^{}]*\}/g);
      for (const match of objectMatches) {
        try {
          const obj = JSON.parse(sanitizeJSON(match[0]));
          if (obj.url) lessons.push(obj);
        } catch (e) {
          // Skip malformed individual objects
        }
      }
      console.log(`Extracted ${lessons.length} lessons via fallback`);
    }

    if (!Array.isArray(lessons)) {
      return [];
    }

    // Determine if each URL is truly atomic and extract course URL
    const enhancedLessons = lessons.map(lesson => {
      const url = lesson.url?.toLowerCase() || '';
      const originalUrl = lesson.url || '';
      
      // Detect placeholder/fake URLs
      const hasPlaceholderID = 
        originalUrl.includes('VIDEO_ID') ||
        originalUrl.includes('LECTURE_ID') ||
        /\/lecture\/[A-Z_]+$/.test(originalUrl) ||  // e.g., /lecture/VIDEO_ID
        /\/video\/[A-Z_]+$/.test(originalUrl);       // e.g., /video/LESSON_ID
      
      // Detect if this is a course landing page (NOT atomic)
      const isCourseLandingPage = 
        (url.includes('coursera.org/learn/') && !url.includes('/lecture/') && !url.includes('/video/') && !url.includes('/quiz/')) ||
        (url.includes('edx.org/course') && !url.includes('/video/') && !url.includes('/block/')) ||
        (url.includes('udemy.com/course/') && !url.includes('/learn/') && !url.includes('/lecture/')) ||
        (url.includes('linkedin.com/learning/') && !url.includes('/lesson/'));
      
      // Check for real lesson URLs (not placeholders)
      const hasRealLessonPath = !hasPlaceholderID && (
        // Coursera: Real lecture URLs have alphanumeric IDs like /lecture/ABC123
        (url.includes('/lecture/') && /\/lecture\/[a-zA-Z0-9]{5,}/.test(originalUrl)) ||
        (url.includes('/video/') && /\/video\/[a-zA-Z0-9]{5,}/.test(originalUrl)) ||
        (url.includes('/lesson/') && /\/lesson\/[a-zA-Z0-9-]{5,}/.test(originalUrl)) ||
        url.includes('/v/') ||  // Khan Academy
        url.includes('youtube.com/watch') ||
        url.includes('youtu.be/')
      );
      
      // Mark as atomic only if it has a real lesson URL, not a placeholder
      const is_atomic = !isCourseLandingPage && !hasPlaceholderID && hasRealLessonPath;
      
      // Extract course URL from lesson URL if not provided
      let course_url = lesson.course_url || '';
      if (!course_url && originalUrl) {
        if (url.includes('coursera.org/learn/')) {
          // Extract course URL from: https://www.coursera.org/learn/COURSE/lecture/ID
          const courseMatch = originalUrl.match(/(https?:\/\/[^/]+\/learn\/[^/]+)/i);
          if (courseMatch) course_url = courseMatch[1];
        } else if (url.includes('edx.org/course')) {
          // Extract course URL from: https://www.edx.org/course/COURSE/video/...
          const courseMatch = originalUrl.match(/(https?:\/\/[^/]+\/course\/[^/]+)/i);
          if (courseMatch) course_url = courseMatch[1];
        } else if (url.includes('udemy.com/course/')) {
          // Extract course URL from: https://www.udemy.com/course/COURSE/learn/...
          const courseMatch = originalUrl.match(/(https?:\/\/[^/]+\/course\/[^/]+)/i);
          if (courseMatch) course_url = courseMatch[1];
        }
      }

      return {
        ...lesson,
        provider: lesson.provider || inferMOOCSource(lesson.url),
        authority_level: lesson.authority_level || (
          url.includes('coursera.org') || url.includes('edx.org') || url.includes('khanacademy.org')
            ? 'academic'
            : url.includes('udemy.com') || url.includes('linkedin.com')
              ? 'professional'
              : 'community'
        ),
        is_atomic: lesson.is_atomic !== false ? is_atomic : false,
        course_title: lesson.course_title || '',
        course_url: course_url
      };
    });

    // FALLBACK STRATEGY: If no atomic content found, return empty and let YouTube/articles handle it
    const atomicOnly = enhancedLessons.filter(l => l.is_atomic);
    if (atomicOnly.length === 0) {
      console.log('⚠️ No atomic MOOC content found, falling back to videos/articles');
      // Still return non-atomic with warning, but limited
      return enhancedLessons
        .filter(l => l.url && !blacklist.includes(l.url))
        .slice(0, 2);
    }

    console.log(`✓ Found ${atomicOnly.length} atomic learning units`);

    // Return only atomic content, max 2
    return atomicOnly
      .filter(l => l.url && !blacklist.includes(l.url))
      .slice(0, 2);
      
  } catch (error) {
    console.error('Atomic MOOC search error:', error);
    return [];
  }
}

interface ScoreBreakdown {
  syllabusMatch: number;
  authorityMatch: number;
  atomicScope: number;
  total: number;
}

interface CuratedResource {
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
  origin: 'syllabus_cited' | 'authority_domain' | 'ai_selected';
  scoreBreakdown: ScoreBreakdown;
  rationale: string;
  consumptionTime: string;
  coveragePercent?: number;
  verified?: boolean;
  whyThisVideo?: string;
  focusHighlight?: string;
  keyMoments?: { time: string; label: string }[];
  archivedUrl?: string;
  courseName?: string; // Parent course name for MOOC video lessons
}

interface CuratedStepResources {
  coreVideo: CuratedResource | null;
  coreReading: CuratedResource | null;
  learningObjective: string;
  totalCoreTime: string;
  totalExpandedTime: string;
  deepDive: CuratedResource[];
  expansionPack: CuratedResource[];
  moocs: any[]; // Dedicated MOOC array for Online Courses tab
  knowledgeCheck?: {
    question: string;
    supplementalResourceId?: string;
  };
  // Legacy compatibility
  videos: any[];
  readings: any[];
  books: any[];
  alternatives: any[];
}

interface StepResources {
  videos: Array<{
    url: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: string;
    whyThisVideo: string;
    keyMoments?: { time: string; label: string }[];
    verified?: boolean;
    archivedUrl?: string;
  }>;
  
  readings: Array<{
    url: string;
    domain: string;
    title: string;
    author?: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
    embeddedContent?: string;
    contentExtractionStatus?: 'success' | 'partial' | 'failed';
    specificReadings?: Array<{
      citation: string;
      url: string;
      type: 'pdf' | 'article' | 'chapter' | 'external';
      verified?: boolean;
      archivedUrl?: string;
    }>;
    verified?: boolean;
    archivedUrl?: string;
    directPdfUrl?: string;
  }>;
  
  books: Array<{
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
    verified?: boolean;
    archivedUrl?: string;
    embeddedContent?: string;
    isPublicDomain?: boolean;
  }>;
  
  alternatives: Array<{
    type: 'podcast' | 'mooc' | 'video' | 'article' | 'book';
    url: string;
    title: string;
    source: string;
    duration?: string;
    author?: string;
    verified?: boolean;
    archivedUrl?: string;
  }>;
}

// Scoring function for resources - enhanced for atomic content
function scoreResource(
  resource: any, 
  syllabusContent: string,
  resourceType: 'video' | 'reading' | 'book' | 'alternative'
): { score: ScoreBreakdown; origin: 'syllabus_cited' | 'authority_domain' | 'ai_selected' } {
  let syllabusMatch = 0;
  let authorityMatch = 0;
  let atomicScope = 0;
  let origin: 'syllabus_cited' | 'authority_domain' | 'ai_selected' = 'ai_selected';

  // Criterion A: Syllabus Match (50 points)
  if (syllabusContent) {
    const syllabusLower = syllabusContent.toLowerCase();
    const titleLower = (resource.title || '').toLowerCase();
    const authorLower = (resource.author || '').toLowerCase();
    
    // Check if title or author appears in syllabus content
    if (titleLower && syllabusLower.includes(titleLower.substring(0, 30))) {
      syllabusMatch = 50;
      origin = 'syllabus_cited';
    } else if (authorLower && authorLower.length > 3 && syllabusLower.includes(authorLower)) {
      syllabusMatch = 50;
      origin = 'syllabus_cited';
    }
  }

  // Criterion B: Authority Match (30 points)
  if (resource.url) {
    try {
      const urlObj = new URL(resource.url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Check against known authority domains
      for (const [authDomain, info] of Object.entries(AUTHORITY_DOMAINS)) {
        if (domain.includes(authDomain) || authDomain.includes(domain)) {
          authorityMatch = 30;
          if (origin !== 'syllabus_cited') {
            origin = 'authority_domain';
          }
          break;
        }
      }
    } catch (e) {
      // Invalid URL
    }
  }

  // Criterion C: Atomic Scope (30 points for atomic, -30 penalty for full courses)
  const url = resource.url || '';
  
  // Check for explicit is_atomic flag from AtomicMOOCResource
  if (resource.is_atomic === true) {
    atomicScope = 30; // High reward for confirmed atomic content
  } else if (resource.is_atomic === false) {
    atomicScope = -30; // Penalty for full course fallback
  } else {
    // Legacy logic for non-MOOC resources
    const isLandingPage = 
      (url.includes('/learn/') && !url.includes('/lecture/') && !url.includes('/video/')) ||
      (url.includes('coursera.org') && !url.includes('/lecture')) ||
      (url.includes('edx.org') && url.endsWith('/course'));
    const isBookSalesPage = url.includes('amazon.com') || url.includes('/buy') || url.includes('/purchase');
    const isSpecificContent = 
      url.includes('youtube.com/watch') ||
      url.includes('youtu.be/') ||
      url.includes('.pdf') ||
      url.includes('/article/') ||
      url.includes('/entry/') ||
      url.includes('/wiki/');

    if (isLandingPage || isBookSalesPage) {
      atomicScope = -50; // Penalty for container pages
    } else if (isSpecificContent) {
      atomicScope = 20; // Reward for atomic content
    } else {
      atomicScope = 10; // Neutral
    }
  }

  const total = Math.max(0, syllabusMatch + authorityMatch + atomicScope);

  return {
    score: { syllabusMatch, authorityMatch, atomicScope, total },
    origin
  };
}

// Generate learning objective for a step
function generateLearningObjective(stepTitle: string, discipline: string): string {
  const cleanTitle = stepTitle.replace(/^\d+\.\s*/, '').trim();
  return `By the end of this step, you will understand the key concepts of ${cleanTitle} and be able to apply them in ${discipline}.`;
}

// Generate knowledge check question
function generateKnowledgeCheck(stepTitle: string): { question: string; supplementalResourceId?: string } {
  const cleanTitle = stepTitle.replace(/^\d+\.\s*/, '').trim();
  return {
    question: `Can you explain the main concepts of ${cleanTitle} in your own words?`,
    supplementalResourceId: '0'
  };
}

// Calculate total time from resources
function calculateTotalTime(resources: any[]): string {
  let totalMinutes = 0;
  
  for (const r of resources) {
    if (!r) continue;
    const time = r.consumptionTime || r.duration || '';
    const match = time.match(/(\d+)/);
    const mins = match ? parseInt(match[1]) : 10;
    totalMinutes += mins;
  }
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${totalMinutes} mins`;
}

// Transform legacy resource to curated format
function transformToCuratedResource(
  resource: any, 
  type: string, 
  syllabusContent: string
): CuratedResource {
  const { score, origin } = scoreResource(resource, syllabusContent, type as any);
  
  let domain = '';
  try {
    domain = new URL(resource.url || '').hostname.replace('www.', '');
  } catch (e) {}

  // Generate rationale based on origin
  let rationale = resource.whyThisVideo || resource.why || resource.focusHighlight || '';
  if (!rationale) {
    if (origin === 'syllabus_cited') {
      rationale = `Cited in authoritative university syllabi for ${type === 'video' ? 'this topic' : 'deep understanding'}.`;
    } else if (origin === 'authority_domain') {
      const authInfo = Object.entries(AUTHORITY_DOMAINS).find(([d]) => domain.includes(d));
      rationale = authInfo ? `From ${authInfo[1].reason}.` : `From a recognized authority in the field.`;
    } else {
      rationale = `Selected for relevance and clarity on this topic.`;
    }
  }

  // Estimate consumption time
  let consumptionTime = resource.duration || '';
  if (!consumptionTime) {
    if (type === 'video') consumptionTime = '10 mins';
    else if (type === 'reading') consumptionTime = '15 mins read';
    else if (type === 'book') consumptionTime = '30 mins';
    else consumptionTime = '10 mins';
  }

  return {
    url: resource.url || '',
    title: resource.title || '',
    author: resource.author,
    duration: resource.duration,
    thumbnailUrl: resource.thumbnailUrl,
    domain,
    snippet: resource.snippet,
    embeddedContent: resource.embeddedContent,
    type,
    priority: score.total >= 50 ? 'mandatory' : 'optional_expansion',
    origin,
    scoreBreakdown: score,
    rationale,
    consumptionTime,
    coveragePercent: score.total >= 70 ? 90 : score.total >= 50 ? 80 : 70,
    verified: resource.verified,
    whyThisVideo: resource.whyThisVideo,
    focusHighlight: resource.focusHighlight,
    keyMoments: resource.keyMoments,
    archivedUrl: resource.archivedUrl
  };
}

// Curate resources into MED format
function curateResources(
  resources: StepResources, 
  stepTitle: string, 
  discipline: string,
  syllabusContent: string
): CuratedStepResources {
  // Transform and score all resources
  const scoredVideos = (resources.videos || [])
    .filter(v => v.url && v.verified !== false)
    .map(v => transformToCuratedResource(v, 'video', syllabusContent))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);

  const scoredReadings = (resources.readings || [])
    .filter(r => r.url && r.verified !== false)
    .map(r => transformToCuratedResource(r, 'reading', syllabusContent))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);

  const scoredBooks = (resources.books || [])
    .filter(b => b.url)
    .map(b => transformToCuratedResource(b, 'book', syllabusContent))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);

  const scoredAlternatives = (resources.alternatives || [])
    .filter(a => a.url && a.verified !== false)
    .map(a => transformToCuratedResource(a, a.type || 'article', syllabusContent))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);

  // Select core resources (highest scoring)
  const coreVideo = scoredVideos[0] || null;
  const coreReading = scoredReadings[0] || null;

  // Deep dive: next 2-3 best resources
  const deepDive: CuratedResource[] = [
    ...scoredVideos.slice(1, 2),
    ...scoredReadings.slice(1, 3)
  ];

  // Expansion pack: everything else (excluding MOOCs which go in separate array)
  const nonMoocAlternatives = scoredAlternatives.filter(a => a.type !== 'mooc');
  const moocs = scoredAlternatives.filter(a => a.type === 'mooc');
  
  const expansionPack: CuratedResource[] = [
    ...scoredVideos.slice(2),
    ...scoredReadings.slice(3),
    ...scoredBooks,
    ...nonMoocAlternatives
  ];

  // Mark core resources
  if (coreVideo) coreVideo.priority = 'mandatory';
  if (coreReading) coreReading.priority = 'mandatory';

  return {
    coreVideo,
    coreReading,
    learningObjective: generateLearningObjective(stepTitle, discipline),
    totalCoreTime: calculateTotalTime([coreVideo, coreReading].filter(Boolean)),
    totalExpandedTime: calculateTotalTime([...deepDive, ...expansionPack]),
    deepDive,
    expansionPack,
    moocs: moocs.map(m => {
      // Get original resource to preserve atomic fields
      const original = (resources.alternatives || []).find((a: any) => a.url === m.url) as any || {};
      return {
        url: m.url,
        title: m.title,
        source: inferMOOCSource(m.url, m.domain),
        duration: m.consumptionTime || m.duration,
        verified: m.verified,
        thumbnailUrl: m.thumbnailUrl,
        description: m.snippet || (original as any).description || '',
        author: m.author || (original as any).author || '',
        // New atomic fields
        course_title: (original as any).course_title || m.courseName || '',
        course_url: (original as any).course_url || '',
        authority_level: (original as any).authority_level || '',
        is_atomic: (original as any).is_atomic
      };
    }),
    knowledgeCheck: generateKnowledgeCheck(stepTitle),
    // Legacy compatibility
    videos: resources.videos || [],
    readings: resources.readings || [],
    books: resources.books || [],
    alternatives: resources.alternatives || []
  };
}

async function verifyYouTubeVideo(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return response.ok;
  } catch (error) {
    console.error('YouTube oEmbed verification failed:', videoId, error);
    return false;
  }
}

// PRIMARY VIDEO DISCOVERY: YouTube Data API v3
async function searchYouTubeAPI(stepTitle: string, discipline: string, blacklist: string[]): Promise<any[]> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) {
    console.log('YOUTUBE_API_KEY not configured, skipping YouTube API search');
    return [];
  }

  // Clean step title: remove "Module X - Step Y:" prefix or simple "1. " prefix
  const cleanedTitle = stepTitle
    .replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '')
    .trim();
  
  console.log('🎬 Searching YouTube Data API for:', cleanedTitle, 'in', discipline);

  try {
    // Build focused search query - use quotes for exact topic match
    // Example: "Planning UX Research" tutorial lecture
    const searchQuery = `"${cleanedTitle}" ${discipline}`;
    
    console.log('📹 YouTube search query:', searchQuery);
    
    // Search for videos - request 15 to filter down to 5-10 quality results
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '15');
    searchUrl.searchParams.set('videoDuration', 'medium'); // 4-20 minutes
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('relevanceLanguage', 'en');
    searchUrl.searchParams.set('safeSearch', 'strict');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('YouTube API search failed:', searchResponse.status, errorText);
      return [];
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('No videos found in YouTube API search');
      return [];
    }

    console.log(`YouTube API returned ${searchData.items.length} results`);

    // Get video IDs for details lookup
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // Fetch video details (duration, view count, etc.)
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,statistics,snippet');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    
    if (!detailsResponse.ok) {
      console.error('YouTube API details fetch failed');
      // Fall back to search results without details
      return searchData.items.slice(0, 10).map((item: any) => ({
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        duration: '',
        whyThisVideo: `Found via YouTube search for "${cleanedTitle}"`,
        verified: true,
        keyMoments: []
      }));
    }

    const detailsData = await detailsResponse.json();

    // Filter and format videos
    const videos = detailsData.items
      .filter((video: any) => {
        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
        // Filter out blacklisted videos
        if (blacklist.some(url => url.includes(video.id))) {
          return false;
        }
        // Parse duration (PT#M#S format)
        const duration = video.contentDetails?.duration || '';
        const minutes = parseInt(duration.match(/(\d+)M/)?.[1] || '0');
        // Keep videos between 3 and 25 minutes for optimal learning
        return minutes >= 3 && minutes <= 25;
      })
      .slice(0, 10) // Take top 10
      .map((video: any) => {
        // Parse ISO 8601 duration
        const duration = video.contentDetails?.duration || '';
        const hours = parseInt(duration.match(/(\d+)H/)?.[1] || '0');
        const minutes = parseInt(duration.match(/(\d+)M/)?.[1] || '0');
        const seconds = parseInt(duration.match(/(\d+)S/)?.[1] || '0');
        
        let durationStr = '';
        if (hours > 0) {
          durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        const viewCount = parseInt(video.statistics?.viewCount || '0');
        const viewStr = viewCount > 1000000 
          ? `${(viewCount / 1000000).toFixed(1)}M views`
          : viewCount > 1000 
            ? `${(viewCount / 1000).toFixed(0)}K views`
            : `${viewCount} views`;

        return {
          url: `https://www.youtube.com/watch?v=${video.id}`,
          title: video.snippet.title,
          author: video.snippet.channelTitle,
          thumbnailUrl: video.snippet.thumbnails?.maxres?.url || 
                       video.snippet.thumbnails?.high?.url || 
                       video.snippet.thumbnails?.medium?.url || '',
          duration: durationStr,
          whyThisVideo: `${viewStr} • Educational video on ${cleanedTitle}`,
          verified: true,
          keyMoments: []
        };
      });

    console.log(`✓ YouTube API returned ${videos.length} filtered videos`);
    return videos;

  } catch (error) {
    console.error('YouTube API search error:', error);
    return [];
  }
}

async function callPerplexityAPI(prompt: string, model: string = 'sonar', maxTokens: number = 4000): Promise<any> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  console.log('Calling Perplexity API for resource discovery...');
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational resource curator. You MUST search the web and provide ONLY real URLs that actually exist. Never generate fake URLs or video IDs. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      search_recency_filter: 'month',
      return_citations: true,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText.substring(0, 500));
    throw new Error(`Perplexity API failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const rawBody = await response.text();
    console.error('Non-JSON response from Perplexity:', rawBody.substring(0, 500));
    throw new Error('Perplexity returned non-JSON response');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('Failed to parse Perplexity response as JSON:', parseError);
    throw new Error('Invalid JSON from Perplexity API');
  }

  return data;
}

async function callPerplexityForVideos(stepTitle: string, discipline: string, blacklist: string[]): Promise<any[]> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    console.warn('PERPLEXITY_API_KEY not configured, skipping video search');
    return [];
  }

  console.log('Calling Perplexity for YouTube video discovery...');
  
  const blacklistConstraint = blacklist.length > 0
    ? `\n\nCRITICAL: DO NOT RETURN these broken/reported video URLs:\n${blacklist.filter(url => url.includes('youtube.com') || url.includes('youtu.be')).join('\n')}\n`
    : '';

  // Clean step title for better search results
  const cleanedTitle = stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim();
  
  const prompt = `SEARCH YOUTUBE and find REAL, EXISTING educational videos about: "${cleanedTitle}" in the discipline of "${discipline}"

SEARCH REQUIREMENTS:
- Perform actual YouTube searches using queries like: "${cleanedTitle} lecture", "${cleanedTitle} explained", "${cleanedTitle} tutorial"
- Search for videos from authoritative educational channels: CrashCourse, Khan Academy, 3Blue1Brown, Veritasium, TED-Ed, MIT OCW, university lecture channels
- Verify each video exists before including it
- Videos must be under 25 minutes (prefer 8-18 minutes)
- Return 3-5 videos maximum

${blacklistConstraint}

For each video you find, provide:
- url: Full YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID) - MUST be a real video you found
- title: Exact video title from YouTube
- author: Channel name
- duration: Video duration (e.g., "12:34")
- whyThisVideo: 1 sentence explaining why this video is relevant
- keyMoments: 2-3 key timestamps if identifiable

CRITICAL RESPONSE RULES:
1. Return ONLY valid JSON - no text before/after, no apologies, no explanations
2. Start response with [ and end with ]
3. Only include videos that ACTUALLY EXIST on YouTube right now
4. If you cannot find real videos, return an empty array: []
5. Never invent video IDs or make up URLs

RESPONSE FORMAT:
[
  {
    "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID",
    "title": "Exact title from YouTube",
    "author": "Channel name",
    "duration": "12:34",
    "whyThisVideo": "One sentence explanation",
    "keyMoments": [{"time": "0:45", "label": "Introduction"}]
  }
]`;

  try {
    const data = await callPerplexityAPI(prompt, 'sonar-pro');
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.warn('No content in Perplexity video response');
      return [];
    }
    
    const videos = extractJSON(content);
    if (Array.isArray(videos)) {
      // Add thumbnails to each video
      return videos.map(video => ({
        ...video,
        thumbnailUrl: generateYouTubeThumbnail(video.url)
      }));
    }
    return [];
  } catch (e) {
    console.error('Failed to parse Perplexity video response:', e);
    return [];
  }
}

// Attempt 2: Brute Force - Target famous educational channels
async function searchBruteForceVideos(stepTitle: string, discipline: string, blacklist: string[]): Promise<any[]> {
  const blacklistConstraint = blacklist.length > 0
    ? `DO NOT return these URLs: ${blacklist.filter(url => url.includes('youtube')).join(', ')}`
    : '';

  // Clean step title for better search results
  const cleanedTitle = stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim();
  
  const prompt = `SEARCH YouTube NOW for: site:youtube.com (CrashCourse OR "TED-Ed" OR "Khan Academy" OR "3Blue1Brown" OR Veritasium) "${cleanedTitle}"

Find videos from these TRUSTED channels that actually exist.

${blacklistConstraint}

Return ONLY valid JSON array:
[{"url": "https://www.youtube.com/watch?v=REAL_ID", "title": "exact title", "author": "channel", "duration": "10:00", "whyThisVideo": "reason"}]

If nothing found, return []`;

  try {
    const data = await callPerplexityAPI(prompt, 'sonar-pro', 1500);
    const content = data.choices[0]?.message?.content;
    if (!content) return [];
    
    const videos = extractJSON(content);
    if (Array.isArray(videos)) {
      return videos.map(video => ({
        ...video,
        thumbnailUrl: generateYouTubeThumbnail(video.url)
      }));
    }
    return [];
  } catch (e) {
    console.error('Brute force video search failed:', e);
    return [];
  }
}

// Attempt 3: Hail Mary - Generic lecture search
async function searchHailMaryVideos(stepTitle: string, discipline: string, blacklist: string[]): Promise<any[]> {
  // Clean step title for better search results
  const cleanedTitle = stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim();
  
  const prompt = `SEARCH YouTube for: site:youtube.com "${cleanedTitle}" lecture OR tutorial OR explained

Find ANY educational video that exists and is relevant to "${cleanedTitle}" in ${discipline}.

Return ONLY the first working video you find as JSON:
[{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "title": "title", "author": "channel", "duration": "duration", "whyThisVideo": "General lecture on topic"}]`;

  try {
    const data = await callPerplexityAPI(prompt, 'sonar-pro', 1000);
    const content = data.choices[0]?.message?.content;
    if (!content) return [];
    
    const videos = extractJSON(content);
    if (Array.isArray(videos)) {
      return videos.map(video => ({
        ...video,
        thumbnailUrl: generateYouTubeThumbnail(video.url)
      }));
    }
    return [];
  } catch (e) {
    console.error('Hail mary video search failed:', e);
    return [];
  }
}

// Dedicated reading search with broader sources for practical topics
async function searchReadingsWithBroadSources(stepTitle: string, discipline: string, blacklist: string[]): Promise<any[]> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    console.warn('PERPLEXITY_API_KEY not configured, skipping reading search');
    return [];
  }

  const cleanedTitle = stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim();
  
  const blacklistConstraint = blacklist.length > 0
    ? `\n\nDO NOT return these URLs: ${blacklist.slice(0, 10).join(', ')}`
    : '';

  console.log(`📚 Searching for readings on: "${cleanedTitle}" in ${discipline}...`);

  const prompt = `SEARCH for ARTICLES and TUTORIALS about: "${cleanedTitle}" in ${discipline}

SEARCH THESE SOURCES (in order of priority):
1. Wikipedia articles on the topic
2. Industry blogs and authority sites (e.g., photography: fstoppers.com, petapixel.com, dpreview.com)
3. Tutorial sites (e.g., Medium, Substack, specialized blogs)
4. Official documentation and guides
5. How-to guides from reputable publishers

CRITICAL: 
- Return REAL URLs that actually exist
- Include a mix of beginner-friendly and intermediate content
- DO NOT return only academic sources - include practical tutorials

${blacklistConstraint}

Return 3-5 high-quality articles as JSON array:
[
  {
    "url": "https://real-url.com/article",
    "title": "Exact article title",
    "author": "Author name if available",
    "domain": "domain.com",
    "snippet": "2-3 sentences from the actual article",
    "focusHighlight": "Which sections to focus on",
    "readingTime": "5 mins"
  }
]

If no articles found, return: []`;

  try {
    const data = await callPerplexityAPI(prompt, 'sonar-pro', 2000);
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.warn('No content in Perplexity readings response');
      return [];
    }
    
    const readings = extractJSON(content);
    if (Array.isArray(readings) && readings.length > 0) {
      console.log(`✓ Found ${readings.length} readings via dedicated search`);
      return readings;
    }
    
    console.log('No readings found in Perplexity response');
    return [];
  } catch (e) {
    console.error('Readings search failed:', e);
    return [];
  }
}

function generateYouTubeThumbnail(url: string): string {
  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (videoIdMatch) {
    return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
  }
  return '';
}

function transformToReadingsUrl(url: string): string {
  // MIT OCW: /pages/syllabus/ → /pages/readings/
  if (url.includes('ocw.mit.edu') && url.includes('/pages/syllabus')) {
    return url.replace('/pages/syllabus', '/pages/readings');
  }
  // Could add similar patterns for other OCW platforms
  return url;
}

async function validateUrl(url: string): Promise<{ 
  isValid: boolean; 
  finalUrl: string; 
  archivedUrl?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD', 
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { isValid: true, finalUrl: response.url };
    }

    // Some sites (notably Coursera/Wikipedia/etc.) return 403/404/405 for HEAD even when GET works.
    if ([403, 404, 405].includes(response.status)) {
      try {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 5000);
        const getResponse = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: getController.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (compatible; ProjectHermesBot/1.0)'
          }
        });
        clearTimeout(getTimeoutId);

        if (getResponse.ok) {
          return { isValid: true, finalUrl: getResponse.url };
        }

        console.log(`URL GET validation also failed (${getResponse.status}) for ${url}`);
      } catch (e) {
        console.log(`URL GET validation failed for ${url}:`, e);
      }
    }
    
    console.log(`URL validation failed (${response.status}) for ${url}`);
    const waybackResponse = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    );
    const waybackData = await waybackResponse.json();
    
    if (waybackData.archived_snapshots?.closest?.available) {
      return { 
        isValid: false, 
        finalUrl: url,
        archivedUrl: waybackData.archived_snapshots.closest.url 
      };
    }
    
    return { isValid: false, finalUrl: url };
  } catch (error) {
    console.warn(`URL validation failed for ${url}:`, error);
    return { isValid: false, finalUrl: url };
  }
}

async function findDirectPdfUrl(pageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(pageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const html = await response.text();
    
    const pdfMatches = html.match(/href=["']([^"']*\.pdf)["']/gi);
    if (pdfMatches && pdfMatches.length > 0) {
      const pdfPath = pdfMatches[0].match(/href=["']([^"']+)["']/i)?.[1];
      if (pdfPath) {
        const baseUrl = new URL(pageUrl);
        return new URL(pdfPath, baseUrl).href;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function validateAndEnhanceResources(resources: StepResources, stepTitle: string, discipline: string): Promise<StepResources> {
  const enhanced = { ...resources };
  
  // Validate videos with YouTube oEmbed verification
  if (enhanced.videos?.length) {
    console.log(`Validating ${enhanced.videos.length} videos...`);
    const validatedVideos = await Promise.all(
      enhanced.videos.map(async (video) => {
        // Extract video ID from URL
        const videoIdMatch = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (!videoIdMatch) {
          console.log('Invalid YouTube URL format:', video.url);
          return { ...video, verified: false };
        }
        
        const videoId = videoIdMatch[1];
        const isValidVideo = await verifyYouTubeVideo(videoId);
        
        if (!isValidVideo) {
          console.log('YouTube video verification failed:', videoId);
          return { ...video, verified: false };
        }
        
        const validation = await validateUrl(video.url);
        return {
          ...video,
          verified: validation.isValid && isValidVideo,
          archivedUrl: validation.archivedUrl
        };
      })
    );
    // Keep all videos, let frontend decide what to show
    enhanced.videos = validatedVideos;
    const verifiedCount = validatedVideos.filter(v => v.verified !== false).length;
    console.log(`${verifiedCount} videos passed verification`);
  }
  
  // Validate and enhance readings with content extraction
  if (enhanced.readings?.length) {
    enhanced.readings = await Promise.all(
      enhanced.readings.map(async (reading) => {
        const validation = await validateUrl(reading.url);
        const directPdf = await findDirectPdfUrl(reading.url);
        
        // Attempt content extraction for high-authority sources
        let embeddedContent = undefined;
        let contentStatus: 'success' | 'partial' | 'failed' = 'failed';
        let extractedAuthor = reading.author;
        
        if (reading.domain.includes('stanford.edu') || 
            reading.domain.includes('wikipedia.org') ||
            reading.domain.includes('gutenberg.org') ||
            reading.domain.includes('archive.org')) {
          const extraction = await extractArticleContent(reading.url);
          embeddedContent = extraction.content || undefined;
          contentStatus = extraction.status;
          if (extraction.author) {
            extractedAuthor = extraction.author;
          }
        }
        
        const enhancedReading = {
          ...reading,
          author: extractedAuthor,
          verified: validation.isValid,
          archivedUrl: validation.archivedUrl,
          directPdfUrl: directPdf || undefined,
          embeddedContent,
          contentExtractionStatus: contentStatus
        };
        
        if (enhancedReading.specificReadings) {
          enhancedReading.specificReadings = await Promise.all(
            enhancedReading.specificReadings.map(async (specific) => {
              if (specific.url) {
                const readingValidation = await validateUrl(specific.url);
                return { 
                  ...specific, 
                  verified: readingValidation.isValid,
                  archivedUrl: readingValidation.archivedUrl
                };
              }
              return specific;
            })
          );
        }
        
        return enhancedReading;
      })
    );
  }
  
  // Validate and enhance books
  if (enhanced.books?.length) {
    enhanced.books = await Promise.all(
      enhanced.books.map(async (book) => {
        const validation = await validateUrl(book.url);
        return {
          ...book,
          verified: validation.isValid,
          archivedUrl: validation.archivedUrl
        };
      })
    );
  }
  
  // Validate alternatives
  if (enhanced.alternatives?.length) {
    enhanced.alternatives = await Promise.all(
      enhanced.alternatives.map(async (alt) => {
        const validation = await validateUrl(alt.url);
        return {
          ...alt,
          verified: validation.isValid,
          archivedUrl: validation.archivedUrl
        };
      })
    );
  }
  
  return enhanced;
}

function extractJSON(text: string): any {
  // Clean markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Try to find JSON object first
  const jsonObjStart = cleaned.indexOf('{');
  const jsonObjEnd = cleaned.lastIndexOf('}');
  
  // Try to find JSON array
  const jsonArrStart = cleaned.indexOf('[');
  const jsonArrEnd = cleaned.lastIndexOf(']');
  
  // Determine which comes first and is valid
  let jsonString = cleaned;
  
  if (jsonObjStart !== -1 && jsonObjEnd !== -1 && 
      (jsonArrStart === -1 || jsonObjStart < jsonArrStart)) {
    jsonString = cleaned.substring(jsonObjStart, jsonObjEnd + 1);
  } else if (jsonArrStart !== -1 && jsonArrEnd !== -1) {
    jsonString = cleaned.substring(jsonArrStart, jsonArrEnd + 1);
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('Failed to parse JSON from response:', cleaned.substring(0, 200));
    return null;  // Return null instead of throwing
  }
}

async function extractArticleContent(url: string): Promise<{
  content: string | null;
  status: 'success' | 'partial' | 'failed';
  author?: string;
}> {
  try {
    console.log(`Attempting content extraction from: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProjectHermesBot/1.0)'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { content: null, status: 'failed' };
    }
    
    const html = await response.text();
    
    // Stanford Encyclopedia of Philosophy
    if (url.includes('plato.stanford.edu')) {
      // Try multiple selectors for Stanford Encyclopedia
      let match = html.match(/<div id="main-text"[^>]*>([\s\S]*?)<div id="related-entries"/i) ||
                  html.match(/<div id="aueditable"[^>]*>([\s\S]*?)<div id="related-entries"/i) ||
                  html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      
      if (match) {
        let content = match[1];
        
        // Clean up the HTML
        content = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Extract author from the preamble if available
        const authorMatch = html.match(/<meta name="citation_author" content="([^"]+)"/);
        const author = authorMatch ? authorMatch[1] : undefined;
        
        // Limit content to first 3000 words
        const words = content.split(/\s+/);
        if (words.length > 3000) {
          content = words.slice(0, 3000).join(' ') + '...';
        }
        
        return { content, status: 'success', author };
      }
      
      return { content: null, status: 'failed' };
    }
    
    // Wikipedia
    if (url.includes('wikipedia.org')) {
      // Extract main content with improved selector
      const match = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)<div[^>]*id="catlinks"/i);
      if (match) {
        let content = match[1];
        
        // Clean up
        content = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
          .replace(/<div[^>]*class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Limit to first 2500 words
        const words = content.split(/\s+/);
        if (words.length > 2500) {
          content = words.slice(0, 2500).join(' ') + '...';
        }
        
        return { content, status: 'success' };
      }
      
      return { content: null, status: 'failed' };
    }
    
    // Generic fallback for articles
    const mainContentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/) ||
                             html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ||
                             html.match(/<div class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    
    if (mainContentMatch) {
      let content = mainContentMatch[1];
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
      content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
      const truncated = content.substring(0, 10000);
      return { content: truncated, status: 'partial' };
    }
    
    return { content: null, status: 'failed' };
  } catch (error) {
    console.error(`Content extraction failed for ${url}:`, error);
    return { content: null, status: 'failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepTitle, discipline, syllabusUrls = [], rawSourcesContent = '', userTimeBudget, forceRefresh = false } = await req.json();
    
    console.log('Fetching resources for:', { stepTitle, discipline, syllabusUrlsCount: syllabusUrls.length, forceRefresh, hasRawSources: !!rawSourcesContent });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch blacklisted URLs for this discipline
    const { data: reportedLinks } = await supabase
      .from('reported_links')
      .select('url')
      .eq('discipline', discipline);

    const blacklist = reportedLinks?.map(r => r.url) || [];
    console.log(`Found ${blacklist.length} blacklisted URLs for ${discipline}`);

    // Check cache unless force refresh is requested
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('step_resources')
        .select('*')
        .eq('step_title', stepTitle)
        .eq('discipline', discipline)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log('✓ Cache hit, checking for MOOCs...');
        
        // Check if cached data has MOOCs
        const cachedMoocs = cached.resources.moocs || 
          (cached.resources.alternatives || []).filter((a: any) => a.type === 'mooc');
        
        let resourcesWithMoocs = cached.resources;
        
        // If no MOOCs in cache, fetch them now
        if (cachedMoocs.length === 0) {
          console.log('🎓 No MOOCs in cache, fetching atomic learning units...');
          const atomicLessons = await searchAtomicLearningUnits(stepTitle, discipline, blacklist);
          
          console.log(`✓ Atomic Lessons Found: ${atomicLessons.length}`);
          
          if (atomicLessons.length > 0) {
            // Transform AtomicMOOCResource to alternatives format
            const transformedLessons = atomicLessons.map(lesson => ({
              type: 'mooc' as const,
              url: lesson.url,
              title: lesson.title,
              source: lesson.provider,
              duration: lesson.duration || '',
              author: lesson.instructor || '',
              verified: true,
              course_title: lesson.course_title,
              course_url: lesson.course_url,
              authority_level: lesson.authority_level,
              is_atomic: lesson.is_atomic,
              description: lesson.description || ''
            }));
            
            resourcesWithMoocs = {
              ...cached.resources,
              alternatives: [
                ...transformedLessons,
                ...(cached.resources.alternatives || [])
              ]
            };
          }
        }
        
        // CRITICAL: Curate the cached resources before returning
        const syllabusContent = rawSourcesContent || '';
        const curatedResources = curateResources(resourcesWithMoocs, stepTitle, discipline, syllabusContent);
        
        console.log('📦 Returning curated cached resources with MOOCs:', curatedResources.moocs?.length || 0);
        
        return new Response(
          JSON.stringify(curatedResources),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log('Cache miss or refresh requested, fetching new resources...');

    // Transform MIT OCW URLs to readings pages
    const transformedUrls = syllabusUrls.map(transformToReadingsUrl);
    
    // Build context about authoritative sources
    const sourceContext = transformedUrls.length > 0 
      ? `\n\nPrioritize resources from these authoritative syllabi sources:\n${transformedUrls.slice(0, 10).join('\n')}`
      : '';

    // Build blacklist constraint
    const blacklistConstraint = blacklist.length > 0
      ? `\n\nCRITICAL: DO NOT USE these broken/reported URLs:\n${blacklist.join('\n')}\n`
      : '';

    const prompt = `SEARCH THE WEB and find REAL, VERIFIED learning resources for this learning step.

Step: "${stepTitle}"
Discipline: "${discipline}"

${sourceContext}

CRITICAL REQUIREMENTS - YOU MUST ACTUALLY SEARCH AND VERIFY THESE RESOURCES EXIST:

1. READINGS (Search for at least 3 REAL authoritative articles):
   - YOU MUST search these specific domains and return REAL pages:
     * plato.stanford.edu (Stanford Encyclopedia of Philosophy)
     * en.wikipedia.org
     * ocw.mit.edu (MIT OpenCourseWare)
     * gutenberg.org (Project Gutenberg)
     * archive.org (Internet Archive)
   
   - Search queries: "site:plato.stanford.edu ${stepTitle}", "site:en.wikipedia.org ${stepTitle}"
   - DO NOT generate fake URLs - only return pages you found
   
   For each reading provide:
   - REAL, verified URL that exists
   - Exact title from the page
   - Author (if available)
   - Domain (extract from URL)
   - Brief snippet (2-3 sentences from the actual article)
   - "focusHighlight" recommendation (e.g., "Read sections 1-3")

2. BOOKS (Find at least 2 real books):
   - Search for authoritative books on the topic
   - Provide: title, author, URL (to publisher/library/Amazon)
   - Chapter recommendations
   - Brief explanation of relevance

3. ALTERNATIVES (Find 2-3 real supplementary resources):
   - Search for podcasts, MOOC courses, tools
   - Each must have: type, REAL url, title, source, duration

VERIFICATION REQUIREMENTS:
- Every URL you return must be a REAL page you found via web search
- Do not invent course codes or podcast episodes
- If you cannot find a resource, omit it rather than generating a fake URL
- Verify the content matches the topic before including it

${blacklistConstraint}

RESPONSE FORMAT - CRITICAL:
- Return ONLY valid JSON - no explanations, no apologies, no text before/after
- If you cannot find a resource type, return an empty array for that type
- Never begin your response with text like "I appreciate" or "I'm sorry" or "I cannot"
- Start your response with { and end with }
- If you cannot find resources, return: {"readings": [], "books": [], "alternatives": []}

{
  "readings": [
    {
      "url": "REAL URL you found via search",
      "title": "Exact title from page",
      "author": "Author if available",
      "domain": "Domain from URL",
      "snippet": "2-3 sentences from actual article",
      "focusHighlight": "Reading recommendation"
    }
  ],
  "books": [
    {
      "title": "Book title",
      "author": "Author name",
      "url": "Real book URL",
      "source": "Publisher/source",
      "chapterRecommendation": "Chapter suggestions",
      "why": "Relevance explanation"
    }
  ],
  "alternatives": [
    {
      "type": "podcast|mooc|tool",
      "url": "Real resource URL",
      "title": "Resource title",
      "source": "Source name",
      "duration": "Duration/length"
    }
  ]
}`;

    // PRIMARY VIDEO DISCOVERY: YouTube Data API (most reliable)
    console.log('🎬 Starting video discovery with YouTube API...');
    
    // Start resource discovery in parallel while hunting for videos
    const resourcePromise = callPerplexityAPI(prompt);
    
    // Start atomic learning unit search in parallel
    console.log('🎓 Starting atomic learning unit search...');
    const atomicLessonsPromise = searchAtomicLearningUnits(stepTitle, discipline, blacklist);
    
    // Start dedicated reading search in parallel (covers practical topics better)
    console.log('📚 Starting dedicated reading search...');
    const readingsPromise = searchReadingsWithBroadSources(stepTitle, discipline, blacklist);
    
    // Try YouTube API first - this is the most reliable method
    let videos = await searchYouTubeAPI(stepTitle, discipline, blacklist);
    
    // If YouTube API returns videos, we're done!
    if (videos.length >= 3) {
      console.log(`✓ YouTube API returned ${videos.length} verified videos`);
    } else {
      // FALLBACK: Use Perplexity hunter-seeker loop only if YouTube API fails
      console.log('YouTube API returned < 3 videos, falling back to Perplexity...');
      
      let verifiedVideos: any[] = [...videos]; // Keep any YouTube API results
      let attempts = 0;
      const maxAttempts = 3;
      let allRawVideos: any[] = [];

      while (verifiedVideos.length < 3 && attempts < maxAttempts) {
        attempts++;
        console.log(`🎯 Perplexity Video Hunt Attempt ${attempts}/${maxAttempts}...`);
        
        let rawVideos: any[] = [];
        
        if (attempts === 1) {
          rawVideos = await callPerplexityForVideos(stepTitle, discipline, blacklist);
        } else if (attempts === 2) {
          console.log('Escalating to brute force search (famous channels)...');
          rawVideos = await searchBruteForceVideos(stepTitle, discipline, blacklist);
        } else {
          console.log('Escalating to hail mary search (any lecture)...');
          rawVideos = await searchHailMaryVideos(stepTitle, discipline, blacklist);
        }
        
        allRawVideos = [...allRawVideos, ...rawVideos];
        
        // Validate immediately
        if (rawVideos.length > 0) {
          for (const video of rawVideos) {
            const videoId = video.url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
            if (videoId && await verifyYouTubeVideo(videoId)) {
              // Avoid duplicates
              if (!verifiedVideos.some(v => v.url === video.url)) {
                verifiedVideos.push({
                  ...video,
                  thumbnailUrl: generateYouTubeThumbnail(video.url),
                  verified: true
                });
                console.log(`✓ Found verified video: ${video.title}`);
              }
            }
          }
        }
        
        if (verifiedVideos.length >= 3) {
          console.log(`✓ Hunt successful after ${attempts} attempt(s)`);
          break;
        }
      }

      // Merge results - prioritize verified
      videos = verifiedVideos.length > 0 
        ? verifiedVideos 
        : allRawVideos.map(v => ({
            ...v,
            thumbnailUrl: generateYouTubeThumbnail(v.url),
            verified: false
          }));
    }

    const perplexityVideos = videos;
    console.log(`Video discovery complete: ${perplexityVideos.length} videos found`);

    // Wait for resource discovery to complete
    const perplexityData = await resourcePromise;

    const perplexityContent = perplexityData.choices[0]?.message?.content;
    
    if (!perplexityContent) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity raw response:', perplexityContent.substring(0, 500));
    console.log('Perplexity returned', perplexityVideos.length, 'videos');
    
    const perplexityResources = extractJSON(perplexityContent) || {};
    
    // Wait for atomic learning unit results
    const atomicLessons = await atomicLessonsPromise;
    console.log(`✓ Found ${atomicLessons.length} atomic learning units`);
    
    // Transform AtomicMOOCResource to alternatives format
    const transformedLessons = atomicLessons.map(lesson => ({
      type: 'mooc' as const,
      url: lesson.url,
      title: lesson.title,
      source: lesson.provider,
      duration: lesson.duration || '',
      author: lesson.instructor || '',
      verified: true,
      course_title: lesson.course_title,
      course_url: lesson.course_url,
      authority_level: lesson.authority_level,
      is_atomic: lesson.is_atomic,
      description: lesson.description || ''
    }));
    
    // Merge transformed lessons with Perplexity alternatives (lessons first for higher quality)
    const perplexityAlternatives = (perplexityResources.alternatives || []).filter(
      (alt: any) => alt.type !== 'mooc' || !transformedLessons.some((m: any) => m.title === alt.title)
    );
    const mergedAlternatives = [...transformedLessons, ...perplexityAlternatives];
    
    // Wait for dedicated reading search results
    const dedicatedReadings = await readingsPromise;
    console.log(`✓ Dedicated reading search found ${dedicatedReadings.length} readings`);
    
    // Merge readings: dedicated search results first (higher quality for practical topics), then Perplexity
    const perplexityReadings = perplexityResources.readings || [];
    const allReadings = [...dedicatedReadings, ...perplexityReadings];
    
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const mergedReadings = allReadings.filter(r => {
      if (!r.url || seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    });
    
    console.log(`📖 Total readings after merge: ${mergedReadings.length} (${dedicatedReadings.length} dedicated + ${perplexityReadings.length} general)`);
    
    // Merge results with fallbacks
    let resources: StepResources = {
      videos: perplexityVideos || [],
      readings: mergedReadings,
      books: perplexityResources.books || [],
      alternatives: mergedAlternatives,
    };
    
    console.log('Successfully parsed resources:', {
      videoCount: resources.videos?.length || 0,
      readingCount: resources.readings?.length || 0,
      bookCount: resources.books?.length || 0,
      alternativesCount: resources.alternatives?.length || 0,
      atomicLessonCount: atomicLessons.length
    });

    // Validate and enhance all URLs
    console.log('Validating resource URLs...');
    resources = await validateAndEnhanceResources(resources, stepTitle, discipline);
    console.log('URL validation complete');

    // Guarantee at least one video entry exists (even if it's a fallback)
    if (!resources.videos || resources.videos.length === 0) {
      resources.videos = [{
        url: '',
        title: `Search for ${stepTitle} videos`,
        author: 'YouTube Search',
        thumbnailUrl: '',
        duration: '',
        whyThisVideo: `No pre-verified videos found. Click to search YouTube for "${stepTitle}" in ${discipline}`,
        verified: false,
        keyMoments: []
      }];
      console.log('Added fallback video entry for search');
    }

    // Filter out any blacklisted URLs that slipped through
    if (blacklist.length > 0) {
      if (resources.videos) {
        resources.videos = resources.videos.filter(video => !blacklist.includes(video.url));
      }
      if (resources.readings) {
        resources.readings = resources.readings.filter(reading => !blacklist.includes(reading.url));
      }
      if (resources.books) {
        resources.books = resources.books.filter(book => !blacklist.includes(book.url));
      }
      if (resources.alternatives) {
        resources.alternatives = resources.alternatives.filter(alt => !blacklist.includes(alt.url));
      }
      console.log('✓ Filtered out blacklisted URLs');
    }

    // Cache the resources for future use
    try {
      await supabase.from('step_resources').insert({
        step_title: stepTitle,
        discipline: discipline,
        syllabus_urls: syllabusUrls,
        resources: resources
      });
      console.log('✓ Cached resources to database');
    } catch (cacheError) {
      console.error('Failed to cache resources:', cacheError);
      // Continue even if caching fails
    }

    // Curate resources into MED format
    const syllabusContent = rawSourcesContent || '';
    const curatedResources = curateResources(resources, stepTitle, discipline, syllabusContent);
    
    console.log('✓ Curated resources:', {
      hasCoreVideo: !!curatedResources.coreVideo,
      hasCoreReading: !!curatedResources.coreReading,
      deepDiveCount: curatedResources.deepDive.length,
      expansionCount: curatedResources.expansionPack.length
    });

    return new Response(JSON.stringify(curatedResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-step-resources:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      coreVideo: null,
      coreReading: null,
      learningObjective: '',
      totalCoreTime: '0 mins',
      totalExpandedTime: '0 mins',
      deepDive: [],
      expansionPack: [],
      videos: [],
      readings: [],
      books: [],
      alternatives: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
