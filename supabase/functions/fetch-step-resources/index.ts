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
  
  // Validate and enhance videos
  if (enhanced.videos?.length) {
    enhanced.videos = await Promise.all(
      enhanced.videos.map(async (video) => {
        const validation = await validateUrl(video.url);
        return {
          ...video,
          verified: validation.isValid,
          archivedUrl: validation.archivedUrl
        };
      })
    );
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
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  return JSON.parse(cleaned);
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
      const match = html.match(/<div id="aueditable"[^>]*>([\s\S]*?)<\/div>/);
      if (match) {
        let content = match[1];
        // Clean up scripts and styles
        content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        // Extract author
        const authorMatch = html.match(/<meta name="citation_author" content="([^"]+)"/);
        const author = authorMatch ? authorMatch[1] : undefined;
        // Limit content to ~3000 words
        const truncated = content.substring(0, 15000);
        return { content: truncated, status: 'success', author };
      }
    }
    
    // Wikipedia
    if (url.includes('wikipedia.org')) {
      const match = html.match(/<div id="mw-content-text"[^>]*>([\s\S]*?)<div id="catlinks"/);
      if (match) {
        let content = match[1];
        // Remove references, navigation, tables
        content = content.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '');
        content = content.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
        content = content.replace(/<div class="reflist"[^>]*>[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        // Limit content
        const truncated = content.substring(0, 12000);
        return { content: truncated, status: 'success' };
      }
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

    const prompt = `Find the best learning resources for "${stepTitle}" in the context of "${discipline}".${sourceContext}${blacklistConstraint}

CRITICAL: Return AT LEAST 3 videos, AT LEAST 3 readings, and AT LEAST 2 books.

Return a JSON object with these fields:

{
  "videos": [
    {
      "url": "YouTube URL (<20 min, educational, not promotional)",
      "title": "Video title",
      "author": "Channel name",
      "thumbnailUrl": "YouTube thumbnail URL (format: https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg)",
      "duration": "MM:SS format",
      "whyThisVideo": "One sentence explaining why this video is valuable",
      "keyMoments": [
        {"time": "0:00", "label": "Introduction"},
        {"time": "2:45", "label": "Main concept"}
      ]
    }
    // ... AT LEAST 3 videos total
  ],
  
  "readings": [
    {
      "url": "Article URL - PRIORITIZE: Stanford Encyclopedia (plato.stanford.edu), Wikipedia, MIT OCW /pages/readings/, arXiv.org, high-authority academic sources",
      "domain": "plato.stanford.edu",
      "title": "Article/Page title",
      "author": "Author name if known",
      "snippet": "Brief description of the article content (2-3 sentences)",
      "focusHighlight": "What readers should focus on in this article",
      "favicon": "Optional favicon URL",
      "specificReadings": [
        {
          "citation": "Full citation with author, year, title",
          "url": "https://direct-link-to-pdf.pdf or article URL",
          "type": "pdf" | "article" | "chapter" | "external"
        }
      ]
    }
    // ... AT LEAST 3 readings total - MUST prioritize extractable sources: Stanford Encyclopedia, Wikipedia, Project Gutenberg, Archive.org
  ],
  
  "books": [
    {
      "title": "Book title - PREFER: Project Gutenberg (gutenberg.org), Archive.org, classic texts, authoritative textbooks",
      "author": "Author name",
      "url": "Direct URL to readable book (Project Gutenberg, Archive.org preferred)",
      "source": "Project Gutenberg / Archive.org / Open Library / publisher",
      "chapterRecommendation": "e.g., 'Chapter 3: The Nature of Virtue' or 'Pages 45-67'",
      "why": "One sentence on why this book is recommended",
      "isPublicDomain": true/false
    }
    // ... AT LEAST 2 books total
  ],
  
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

HIGH-AUTHORITY SOURCE PRIORITIES FOR READINGS (content will be embedded):
1. Stanford Encyclopedia of Philosophy (plato.stanford.edu) - excellent for philosophy, highly extractable
2. Wikipedia (wikipedia.org) - reliable, comprehensive, highly extractable
3. MIT OCW readings pages (ocw.mit.edu/pages/readings/) - academic quality
4. Project Gutenberg (gutenberg.org) - classic texts, public domain
5. Internet Archive (archive.org) - diverse materials, public access
6. arXiv (arxiv.org) - open access research papers

CRITICAL REQUIREMENTS:
- For readings: MUST include AT LEAST 3 readings from the priority sources above
- For books: MUST include AT LEAST 2 books, preferably from Project Gutenberg or Archive.org
- For videos: MUST include AT LEAST 3 YouTube videos with proper thumbnail URLs
- YouTube thumbnails: Use format https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg where VIDEO_ID is extracted from the video URL
- PDFs: Return DIRECT URLs ending in .pdf, not landing pages
- Citations: Include author names, publication years, full titles
- All URLs must be valid and accessible

Return ONLY the JSON object, no markdown formatting, no explanations.`;

    const data = await callPerplexityAPI(prompt);
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity raw response:', content.substring(0, 500));
    
    let resources: StepResources = extractJSON(content);
    
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
