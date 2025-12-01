import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callPerplexityAPI(prompt: string): Promise<any> {
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
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a podcast link finder. Return ONLY a valid JSON object with a single "url" field containing the actual working podcast URL found via web search. No explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      search_recency_filter: 'month',
      return_citations: true,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API failed: ${response.status}`);
  }

  return await response.json();
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, source, originalUrl } = await req.json();
    
    console.log(`Attempting to recover podcast link for: ${title}`);

    const prompt = `SEARCH the web for the podcast episode "${title}" from ${source}.

Find the ACTUAL working URL for this podcast episode. Search podcast platforms like:
- Apple Podcasts
- Spotify
- Google Podcasts
- The podcast's official website
- YouTube (for podcast episodes)

Return ONLY valid JSON:
{
  "url": "ACTUAL_WORKING_URL_FOUND_VIA_SEARCH"
}

The original URL was: ${originalUrl} (but it doesn't work)`;

    const data = await callPerplexityAPI(prompt);
    const content = data.choices[0]?.message?.content || '';
    
    console.log('Perplexity response:', content.substring(0, 200));

    // Extract JSON from response
    let recovered = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recovered = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse JSON from Perplexity response');
    }

    if (!recovered?.url) {
      console.log('No URL found in response');
      return new Response(JSON.stringify({ 
        recoveredUrl: null,
        message: 'Could not find alternative podcast URL'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate the recovered URL
    const isValid = await validateUrl(recovered.url);
    
    if (!isValid) {
      console.log('Recovered URL failed validation:', recovered.url);
      return new Response(JSON.stringify({ 
        recoveredUrl: null,
        message: 'Found URL but it failed validation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Successfully recovered and validated podcast URL:', recovered.url);
    return new Response(JSON.stringify({ 
      recoveredUrl: recovered.url,
      wasRecovered: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error recovering podcast link:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      recoveredUrl: null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
