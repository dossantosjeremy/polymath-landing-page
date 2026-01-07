/**
 * Learning Object Ontology
 * 
 * This file defines the canonical type system for classifying educational artifacts.
 * These types are explicitly differentiated and should NEVER be treated as interchangeable.
 * 
 * CRITICAL RULE: Only atomic_lesson and module granularity can appear in the Essential Path.
 * Full courses and syllabi MUST be decomposed or shown in separate sections (MOOCs tab, Expansion Pack).
 */

// Explicit granularity classification for learning objects
export type LearningObjectGranularity = 
  | 'atomic_lesson'     // Single video, article, or exercise (5-30 mins) - CAN appear in Essential Path
  | 'module'            // Coherent topic unit (1-4 hours) - CAN appear in Essential Path  
  | 'full_course'       // Complete course requiring enrollment (10-40+ hours) - CANNOT appear in Essential Path
  | 'syllabus'          // Curriculum blueprint (program-level) - CANNOT appear in Essential Path
  | 'unknown';          // Unclassified (requires review)

// Classification result with confidence
export interface GranularityClassification {
  granularity: LearningObjectGranularity;
  confidence: 'high' | 'medium' | 'low';
  requiresDecomposition: boolean;  // true for full_course/syllabus
  parentContainer?: {
    title: string;
    url: string;
    granularity: LearningObjectGranularity;
  };
}

// URL patterns for high-confidence classification
const ATOMIC_LESSON_PATTERNS: RegExp[] = [
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /vimeo\.com\/\d+/i,
  /coursera\.org\/learn\/[^\/]+\/lecture\//i,
  /coursera\.org\/learn\/[^\/]+\/quiz\//i,
  /edx\.org\/.*\/block/i,
  /khanacademy\.org\/.*\/v\//i,
  /khanacademy\.org\/.*\/video\//i,
  /plato\.stanford\.edu\/entries\//i,
  /wikipedia\.org\/wiki\//i,
  /medium\.com\/@?[^\/]+\/[^\/]+/i,
  /\.pdf(\?|$)/i,
  /\/article\//i,
  /\/post\//i,
  /\/blog\//i,
];

const FULL_COURSE_PATTERNS: RegExp[] = [
  /coursera\.org\/learn\/[^\/]+\/?$/i,  // Course landing page (no /lecture/)
  /coursera\.org\/specializations\//i,
  /edx\.org\/course\/[^\/]+\/?$/i,
  /udemy\.com\/course\/[^\/]+\/?$/i,
  /linkedin\.com\/learning\/[^\/]+\/?$/i,
  /skillshare\.com\/classes\/[^\/]+\/?$/i,
  /pluralsight\.com\/courses\//i,
  /udacity\.com\/course\//i,
  /masterclass\.com\/classes\//i,
  /futurelearn\.com\/courses\//i,
];

const SYLLABUS_PATTERNS: RegExp[] = [
  /ocw\.mit\.edu\/courses\/[^\/]+\/?$/i,  // Full OCW course page
  /\/syllabus/i,
  /\/curriculum/i,
  /\/program\//i,
];

/**
 * Classify the granularity of a learning resource based on URL patterns and metadata.
 * This is the authoritative function for determining what can appear in the Essential Path.
 */
export function classifyGranularity(
  url: string, 
  resource?: { is_atomic?: boolean; course_title?: string; course_url?: string }
): GranularityClassification {
  const urlLower = url.toLowerCase();
  
  // 1. Check explicit is_atomic flag first (from MOOC search)
  if (resource?.is_atomic === true) {
    return { 
      granularity: 'atomic_lesson', 
      confidence: 'high',
      requiresDecomposition: false 
    };
  }
  
  if (resource?.is_atomic === false) {
    return { 
      granularity: 'full_course', 
      confidence: 'high',
      requiresDecomposition: true,
      parentContainer: resource.course_url ? {
        title: resource.course_title || 'Course',
        url: resource.course_url,
        granularity: 'full_course'
      } : undefined
    };
  }
  
  // 2. Detect placeholder/fake URLs (e.g., /lecture/VIDEO_ID)
  const hasPlaceholderID = 
    /\/lecture\/[A-Z_]+$/.test(url) ||
    /\/video\/[A-Z_]+$/.test(url) ||
    url.includes('VIDEO_ID') ||
    url.includes('LECTURE_ID');
    
  if (hasPlaceholderID) {
    return {
      granularity: 'unknown',
      confidence: 'low',
      requiresDecomposition: false
    };
  }
  
  // 3. Check URL patterns for high-confidence classification
  
  // Atomic lessons
  for (const pattern of ATOMIC_LESSON_PATTERNS) {
    if (pattern.test(urlLower)) {
      return { 
        granularity: 'atomic_lesson', 
        confidence: 'high',
        requiresDecomposition: false 
      };
    }
  }
  
  // Full courses
  for (const pattern of FULL_COURSE_PATTERNS) {
    if (pattern.test(urlLower)) {
      return { 
        granularity: 'full_course', 
        confidence: 'high',
        requiresDecomposition: true 
      };
    }
  }
  
  // Syllabi
  for (const pattern of SYLLABUS_PATTERNS) {
    if (pattern.test(urlLower)) {
      return { 
        granularity: 'syllabus', 
        confidence: 'high',
        requiresDecomposition: true 
      };
    }
  }
  
  // 4. Default: module-level (articles, docs without clear atomic signals)
  // This is medium confidence - the content might be atomic but we can't be sure
  return { 
    granularity: 'module', 
    confidence: 'medium',
    requiresDecomposition: false 
  };
}

/**
 * Check if a resource is eligible for the Essential Path (core videos/readings).
 * ONLY atomic_lesson and module can appear in the Essential Path.
 */
export function isEssentialPathEligible(granularity: LearningObjectGranularity): boolean {
  return granularity === 'atomic_lesson' || granularity === 'module';
}

/**
 * Get a user-friendly label for the granularity
 */
export function getGranularityLabel(granularity: LearningObjectGranularity): string {
  switch (granularity) {
    case 'atomic_lesson': return 'Lesson';
    case 'module': return 'Module';
    case 'full_course': return 'Full Course';
    case 'syllabus': return 'Syllabus';
    case 'unknown': return 'Resource';
  }
}

/**
 * Get a description for why a resource was excluded from Essential Path
 */
export function getDecompositionMessage(granularity: LearningObjectGranularity, stepTitle: string): string {
  const cleanTitle = stepTitle.replace(/^(Module\s+\d+\s*[-–—]\s*Step\s+\d+\s*[:.]?\s*|\d+\.\s*)/i, '').trim();
  
  switch (granularity) {
    case 'full_course': 
      return `This is a full course. Search for "${cleanTitle}" within it.`;
    case 'syllabus': 
      return `This is a syllabus/curriculum. Navigate to the relevant module on ${cleanTitle}.`;
    default:
      return '';
  }
}
