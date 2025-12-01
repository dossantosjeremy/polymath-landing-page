import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      max_tokens: 4000,
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

async function callGeminiForVideos(stepTitle: string, discipline: string): Promise<any[]> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.warn('LOVABLE_API_KEY not configured, skipping Gemini video search');
    return [];
  }

  console.log('Calling Gemini for YouTube video discovery...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert at finding educational YouTube videos. You have deep knowledge of YouTube's educational content ecosystem including channels like CrashCourse, Khan Academy, 3Blue1Brown, Veritasium, TED-Ed, MIT OpenCourseWare, and academic lecture series.

CRITICAL RULES:
1. ONLY output valid JSON - no explanations, no apologies, no text before/after
2. If you don't know good videos for this topic, return an empty array: []
3. Never say "I'm sorry" or "I cannot" or explain why you can't find videos
4. Return REAL YouTube URLs with actual video IDs that you are confident exist`
        },
        {
          role: 'user',
          content: `Find 3-5 high-quality educational YouTube videos about: "${stepTitle}" in the discipline of "${discipline}"

Requirements:
- Videos must be under 25 minutes (prefer 8-18 minutes for engagement)
- From reputable educational channels (CrashCourse, Khan Academy, 3Blue1Brown, Veritasium, TED-Ed, MIT OCW, university lectures, etc.)
- Directly relevant to the topic
- Return ONLY videos you are confident exist with real video IDs

For each video provide:
- url: Full YouTube URL (https://www.youtube.com/watch?v=REAL_VIDEO_ID)
- title: The exact video title
- author: Channel name
- duration: Estimated duration (e.g., "12:34")
- whyThisVideo: 1 sentence explaining educational value
- keyMoments: 2-3 important timestamps if you know them

RESPONSE FORMAT - START YOUR RESPONSE WITH [ AND END WITH ]:
[
  {
    "url": "https://www.youtube.com/watch?v=...",
    "title": "...",
    "author": "...",
    "duration": "...",
    "whyThisVideo": "...",
    "keyMoments": [{"time": "0:00", "label": "Introduction"}]
  }
]`
        }
      ],
    }),
  });

  if (!response.ok) {
    console.error('Gemini API error:', response.status);
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.warn('No content in Gemini response');
    return [];
  }
  
  try {
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
    console.error('Failed to parse Gemini video response:', e);
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
    
    // For non-OK responses, immediately fail (don't use broken URLs)
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

async function validateAndEnhanceResources(resources: StepResources): Promise<StepResources> {
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
    console.log(`${validatedVideos.filter(v => v.verified !== false).length} videos passed verification`);
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

    // Call Gemini for videos and Perplexity for other resources in parallel
    const [geminiVideos, perplexityData] = await Promise.all([
      callGeminiForVideos(stepTitle, discipline),
      callPerplexityAPI(prompt)
    ]);

    const perplexityContent = perplexityData.choices[0]?.message?.content;
    
    if (!perplexityContent) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity raw response:', perplexityContent.substring(0, 500));
    console.log('Gemini returned', geminiVideos.length, 'videos');
    
    const perplexityResources = extractJSON(perplexityContent) || {};
    
    // Merge results with fallbacks
    let resources: StepResources = {
      videos: geminiVideos || [],
      readings: perplexityResources.readings || [],
      books: perplexityResources.books || [],
      alternatives: perplexityResources.alternatives || [],
    };
    
    console.log('Successfully parsed resources:', {
      videoCount: resources.videos?.length || 0,
      readingCount: resources.readings?.length || 0,
      bookCount: resources.books?.length || 0,
      alternativesCount: resources.alternatives?.length || 0
    });

    // Validate and enhance all URLs
    console.log('Validating resource URLs...');
    resources = await validateAndEnhanceResources(resources);
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

    return new Response(JSON.stringify(resources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-step-resources:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
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
