import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callPerplexityAPI(prompt: string, model: string = 'sonar-pro', maxTokens: number = 2000): Promise<any> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

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
          content: 'You are an expert educational resource curator. Return ONLY valid JSON with real URLs found via web search.'
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
    throw new Error(`Perplexity API failed: ${response.status}`);
  }

  return await response.json();
}

function extractJSON(text: string): any {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonArrStart = cleaned.indexOf('[');
  const jsonArrEnd = cleaned.lastIndexOf(']');
  
  if (jsonArrStart !== -1 && jsonArrEnd !== -1) {
    cleaned = cleaned.substring(jsonArrStart, jsonArrEnd + 1);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('Failed to parse JSON:', cleaned.substring(0, 200));
    return null;
  }
}

async function verifyYouTubeVideo(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return response.ok;
  } catch {
    return false;
  }
}

function generateYouTubeThumbnail(url: string): string {
  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (videoIdMatch) {
    return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
  }
  return '';
}

async function tryFetchArticleContent(url: string): Promise<string | null> {
  try {
    // Skip non-article URLs
    if (url.includes('youtube.com') || url.includes('amazon.com') || url.includes('spotify.com')) {
      return null;
    }
    
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      console.log('FIRECRAWL_API_KEY not configured, skipping content extraction');
      return null;
    }
    
    console.log('Attempting to fetch article content from:', url);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000
      }),
    });
    
    if (!response.ok) {
      console.log('Firecrawl request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const markdown = data?.markdown || data?.data?.markdown;
    
    if (markdown && markdown.length > 100) {
      console.log('Successfully extracted article content, length:', markdown.length);
      // Truncate very long content
      return markdown.length > 5000 ? markdown.substring(0, 5000) + '\n\n[Content truncated...]' : markdown;
    }
    
    return null;
  } catch (err) {
    console.error('Error fetching article content:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resourceType, stepTitle, discipline, existingUrls = [] } = await req.json();
    
    console.log(`Finding additional ${resourceType} for: ${stepTitle}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch blacklisted URLs
    const { data: reportedLinks } = await supabase
      .from('reported_links')
      .select('url')
      .eq('discipline', discipline);

    const blacklist = [...(reportedLinks?.map(r => r.url) || []), ...existingUrls];

    let newResource = null;

    if (resourceType === 'video') {
      const blacklistConstraint = blacklist.length > 0
        ? `DO NOT return these URLs: ${blacklist.filter(url => url.includes('youtube')).join(', ')}`
        : '';

      const prompt = `SEARCH YouTube for ONE additional educational video about "${stepTitle}" in ${discipline}.

${blacklistConstraint}

Find ONE new video that:
- Is from educational channels (CrashCourse, Khan Academy, TED-Ed, MIT, university channels)
- Is under 25 minutes
- Actually exists and is different from already provided videos

Return ONLY valid JSON:
[{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "Exact title",
  "author": "Channel name",
  "duration": "12:34",
  "whyThisVideo": "One sentence explanation"
}]`;

      const data = await callPerplexityAPI(prompt, 'sonar-pro', 1500);
      const videos = extractJSON(data.choices[0]?.message?.content);
      
      console.log('Perplexity response for videos:', data.choices[0]?.message?.content?.substring(0, 200));
      
      if (Array.isArray(videos) && videos.length > 0) {
        const video = videos[0];
        const videoId = video.url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
        
        console.log('Found video candidate:', video.title, 'ID:', videoId);
        
        if (videoId && await verifyYouTubeVideo(videoId)) {
          console.log('Video verified successfully');
          newResource = {
            url: video.url,
            title: video.title,
            author: video.author,
            thumbnailUrl: generateYouTubeThumbnail(video.url),
            duration: video.duration,
            whyThisVideo: video.whyThisVideo,
            verified: true
          };
        } else {
          console.log('Video verification failed');
        }
      } else {
        console.log('No videos found in Perplexity response');
      }
    } else if (resourceType === 'reading') {
      const blacklistConstraint = blacklist.length > 0
        ? `DO NOT return these URLs: ${blacklist.join(', ')}`
        : '';

      const prompt = `SEARCH for ONE additional authoritative reading about "${stepTitle}" in ${discipline}.

${blacklistConstraint}

Search these domains:
- plato.stanford.edu
- en.wikipedia.org
- ocw.mit.edu
- gutenberg.org

Return ONLY valid JSON:
[{
  "url": "REAL URL",
  "title": "Exact title",
  "author": "Author name",
  "domain": "domain.com",
  "snippet": "2-3 sentences",
  "focusHighlight": "Reading recommendation"
}]`;

      const data = await callPerplexityAPI(prompt, 'sonar-pro', 1500);
      const readings = extractJSON(data.choices[0]?.message?.content);
      
      if (Array.isArray(readings) && readings.length > 0) {
        const reading = readings[0];
        // Try to fetch and embed article content
        const embeddedContent = await tryFetchArticleContent(reading.url);
        newResource = { 
          ...reading, 
          verified: true,
          embeddedContent,
          type: 'reading'
        };
      }
    } else if (resourceType === 'podcast') {
      const blacklistConstraint = blacklist.length > 0
        ? `DO NOT return these URLs: ${blacklist.join(', ')}`
        : '';

      const prompt = `SEARCH for ONE podcast episode about "${stepTitle}" in ${discipline}.

${blacklistConstraint}

Search platforms: Spotify, Apple Podcasts, podcast directories

Return ONLY valid JSON:
[{
  "type": "podcast",
  "url": "REAL podcast URL",
  "title": "Episode title",
  "source": "Podcast name",
  "duration": "Duration if available"
}]`;

      const data = await callPerplexityAPI(prompt, 'sonar-pro', 1500);
      const podcasts = extractJSON(data.choices[0]?.message?.content);
      
      if (Array.isArray(podcasts) && podcasts.length > 0) {
        newResource = { ...podcasts[0], verified: true };
      }
    } else if (resourceType === 'mooc') {
      const blacklistConstraint = blacklist.length > 0
        ? `DO NOT return these URLs: ${blacklist.join(', ')}`
        : '';

      const prompt = `SEARCH for ONE additional MOOC course about "${stepTitle}" in ${discipline}.

${blacklistConstraint}

Search platforms: Coursera, edX, Khan Academy, Udacity

Return ONLY valid JSON:
[{
  "type": "mooc",
  "url": "REAL course URL",
  "title": "Course title",
  "source": "Platform name",
  "duration": "Duration if available"
}]`;

      const data = await callPerplexityAPI(prompt, 'sonar-pro', 1500);
      const moocs = extractJSON(data.choices[0]?.message?.content);
      
      if (Array.isArray(moocs) && moocs.length > 0) {
        newResource = { ...moocs[0], verified: true };
      }
    }

    if (!newResource) {
      console.log('No new resource found after search');
      return new Response(JSON.stringify({ 
        error: 'No additional resource found',
        message: 'Could not find any new resources that are not already in your list. Please try again later or search manually.'
      }), {
        status: 200, // Changed from 404 to 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Successfully found new resource:', newResource.title || newResource.url);
    return new Response(JSON.stringify(newResource), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error finding additional resource:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
