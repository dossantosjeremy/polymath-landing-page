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
  } | null;
  
  deepReading: {
    url: string;
    domain: string;
    title: string;
    snippet: string;
    focusHighlight: string;
    favicon?: string;
  } | null;
  
  book: {
    title: string;
    author: string;
    url: string;
    source: string;
    chapterRecommendation?: string;
    why: string;
  } | null;
  
  alternatives: Array<{
    type: 'podcast' | 'mooc' | 'video' | 'article' | 'book';
    url: string;
    title: string;
    source: string;
    duration?: string;
    author?: string;
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

function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Find JSON object boundaries
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

    const prompt = `Find the best learning resources for "${stepTitle}" in the context of "${discipline}".${sourceContext}

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
    "url": "Article/PDF URL or readings page URL (prefer /pages/readings/ for MIT OCW)",
    "domain": "mit.edu",
    "title": "Course/Article title",
    "snippet": "Specific reading citation (e.g., 'Rosenzweig chapters 14-15, Gazzaniga chapter 8')",
    "focusHighlight": "Exact reading assignment (book, chapter, article, page ranges)",
    "favicon": "Optional favicon URL"
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

IMPORTANT INSTRUCTIONS:
- For MIT OCW sources: ALWAYS use /pages/readings/ URLs (not /pages/syllabus/)
- Extract SPECIFIC reading assignments from the readings page (author, book title, chapters, page ranges)
- Format citations properly (e.g., "Rosenzweig chapters 14-15" or "Mackay, Donald M. The Bankruptcy of Determinism. New Scientist 2 (1970): 24-26")
- For deepReading snippet and focusHighlight: include exact citations, not generic summaries

Return ONLY the JSON object, no markdown formatting, no explanations.`;

    const data = await callPerplexityAPI(prompt);
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity raw response:', content.substring(0, 500));
    
    const resources: StepResources = extractJSON(content);
    
    console.log('Successfully parsed resources:', {
      hasVideo: !!resources.primaryVideo,
      hasReading: !!resources.deepReading,
      hasBook: !!resources.book,
      alternativesCount: resources.alternatives?.length || 0
    });

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
