import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StepResources {
  primaryVideo: {
    url: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: string;
    whyThisVideo: string;
    keyMoments?: { time: string; label: string }[];
    verified?: boolean;
    archivedUrl?: string;
  } | null;
  
  deepReading: {
    url: string;
    domain: string;
    title: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
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
  } | null;
  
  book: {
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
    verified?: boolean;
    archivedUrl?: string;
  } | null;
  
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

async function callPerplexityAPI(prompt: string): Promise<any> {
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
        model: 'sonar',
        messages: [
        {
          role: 'system',
          content: 'You are a learning resource curator. Return ONLY valid JSON with no markdown formatting or explanation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
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
    
    // Try Wayback Machine if HEAD fails
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

async function validateAndEnhanceResources(resources: StepResources): Promise<StepResources> {
  const enhanced = { ...resources };
  
  if (enhanced.primaryVideo?.url) {
    const validation = await validateUrl(enhanced.primaryVideo.url);
    enhanced.primaryVideo = {
      ...enhanced.primaryVideo,
      verified: validation.isValid,
      archivedUrl: validation.archivedUrl
    };
  }
  
  if (enhanced.deepReading?.url) {
    const validation = await validateUrl(enhanced.deepReading.url);
    const directPdf = await findDirectPdfUrl(enhanced.deepReading.url);
    
    enhanced.deepReading = {
      ...enhanced.deepReading,
      verified: validation.isValid,
      archivedUrl: validation.archivedUrl,
      directPdfUrl: directPdf || undefined
    };
    
    if (enhanced.deepReading.specificReadings) {
      enhanced.deepReading.specificReadings = await Promise.all(
        enhanced.deepReading.specificReadings.map(async (reading) => {
          if (reading.url) {
            const readingValidation = await validateUrl(reading.url);
            return { 
              ...reading, 
              verified: readingValidation.isValid,
              archivedUrl: readingValidation.archivedUrl
            };
          }
          return reading;
        })
      );
    }
  }
  
  if (enhanced.book?.url) {
    const validation = await validateUrl(enhanced.book.url);
    enhanced.book = {
      ...enhanced.book,
      verified: validation.isValid,
      archivedUrl: validation.archivedUrl
    };
  }
  
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
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepTitle, discipline, syllabusUrls = [], forceRefresh = false } = await req.json();
    
    console.log('Fetching resources for:', { stepTitle, discipline, syllabusUrlsCount: syllabusUrls.length, forceRefresh });

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
        console.log('✓ Using cached resources');
        return new Response(
          JSON.stringify(cached.resources),
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

    const prompt = `Find the best learning resources for "${stepTitle}" in the context of "${discipline}".${sourceContext}${blacklistConstraint}

Return a JSON object with these fields:

{
  "primaryVideo": {
    "url": "YouTube URL (<20 min, educational, not promotional)",
    "title": "Video title",
    "author": "Channel name",
    "thumbnailUrl": "YouTube thumbnail URL",
    "duration": "MM:SS format",
    "whyThisVideo": "One sentence explaining why this is the best choice",
    "keyMoments": [
      {"time": "0:00", "label": "Introduction"},
      {"time": "2:45", "label": "Main concept"}
    ]
  },
  
  "deepReading": {
    "url": "Main readings page URL (prefer /pages/readings/ for MIT OCW)",
    "domain": "mit.edu",
    "title": "Course/Article title",
    "snippet": "Brief description of readings for this topic",
    "focusHighlight": "Summary of what to focus on",
    "favicon": "Optional favicon URL",
    "specificReadings": [
      {
        "citation": "Kanwisher, N. (2010). Functional specificity in the human brain...",
        "url": "https://direct-link-to-pdf.pdf",
        "type": "pdf"
      },
      {
        "citation": "Gazzaniga, M.S., Ivry, R.B. & Mangun, G.R. Cognitive Neuroscience, Chapters 2-3",
        "url": "https://link-if-available-or-empty-string",
        "type": "chapter"
      }
    ]
  },
  
  "book": {
    "title": "Book title (prefer classic texts, authoritative textbooks, or books from Project Gutenberg, Archive.org)",
    "author": "Author name",
    "url": "URL to book (Project Gutenberg, Archive.org, or authoritative source)",
    "source": "Project Gutenberg / Archive.org / publisher",
    "chapterRecommendation": "e.g., 'Chapter 3: The Nature of Virtue'",
    "why": "One sentence on why this book is recommended"
  },
  
  "alternatives": [
    {
      "type": "podcast" | "mooc" | "video" | "article" | "book",
      "url": "Resource URL",
      "title": "Resource title",
      "source": "Platform name (Spotify, Coursera, edX, etc.)",
      "duration": "Optional duration",
      "author": "Optional author/creator"
    }
  ]
}

CRITICAL LINK REQUIREMENTS:
- For PDFs: Return DIRECT URLs ending in .pdf, not landing pages (e.g., "https://example.edu/paper.pdf")
- For books: Prefer direct Archive.org or Project Gutenberg links to readable content
- For MIT OCW: Use /pages/readings/ URLs (not /pages/syllabus/)
- Extract SPECIFIC reading assignments from readings pages (author, book title, chapters, page ranges)
- When readings pages have DIRECT LINKS to PDFs or articles, include them in deepReading.specificReadings array
- Each specificReading should have: citation (full bibliographic reference), url (direct link if available, empty string if not), type (pdf/article/chapter/external)
- Format citations properly (e.g., "Kanwisher, N. (2010). Functional specificity..." or "Gazzaniga et al., Chapters 2-3")
- If no direct links are available for readings, include them in focusHighlight but omit from specificReadings

Return ONLY the JSON object, no markdown formatting, no explanations.`;

    const data = await callPerplexityAPI(prompt);
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity raw response:', content.substring(0, 500));
    
    let resources: StepResources = extractJSON(content);
    
    console.log('Successfully parsed resources:', {
      hasVideo: !!resources.primaryVideo,
      hasReading: !!resources.deepReading,
      hasBook: !!resources.book,
      alternativesCount: resources.alternatives?.length || 0
    });

    // Validate and enhance all URLs
    console.log('Validating resource URLs...');
    resources = await validateAndEnhanceResources(resources);
    console.log('URL validation complete');

    // Filter out any blacklisted URLs that slipped through
    if (blacklist.length > 0) {
      if (resources.primaryVideo?.url && blacklist.includes(resources.primaryVideo.url)) {
        resources.primaryVideo = null;
      }
      if (resources.deepReading?.url && blacklist.includes(resources.deepReading.url)) {
        resources.deepReading = null;
      }
      if (resources.book?.url && blacklist.includes(resources.book.url)) {
        resources.book = null;
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

    return new Response(JSON.stringify(resources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-step-resources:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      primaryVideo: null,
      deepReading: null,
      book: null,
      alternatives: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
