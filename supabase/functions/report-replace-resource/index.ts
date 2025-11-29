import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callPerplexityAPI(prompt: string): Promise<any> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  console.log('Calling Perplexity API for replacement resource...');
  
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
      max_tokens: 1500,
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

  return await response.json();
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

async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD', 
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.warn(`URL validation failed for ${url}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brokenUrl, resourceType, stepTitle, discipline, reportReason, userId } = await req.json();
    
    console.log('Report & Replace request:', { brokenUrl, resourceType, stepTitle, discipline });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Upsert broken URL to reported_links table
    const { data: existing } = await supabase
      .from('reported_links')
      .select('*')
      .eq('url', brokenUrl)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('reported_links')
        .update({ 
          report_count: existing.report_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('url', brokenUrl);
      console.log('✓ Incremented report count for:', brokenUrl);
    } else {
      await supabase
        .from('reported_links')
        .insert({
          url: brokenUrl,
          resource_type: resourceType,
          step_title: stepTitle,
          discipline: discipline,
          reported_by: userId || null,
          report_reason: reportReason || 'Broken link',
          report_count: 1
        });
      console.log('✓ Added new reported link:', brokenUrl);
    }

    // 2. Fetch all blacklisted URLs for this discipline
    const { data: reportedLinks } = await supabase
      .from('reported_links')
      .select('url')
      .eq('discipline', discipline);

    const blacklist = reportedLinks?.map(r => r.url) || [];
    console.log(`Found ${blacklist.length} blacklisted URLs for ${discipline}`);

    // 3. Generate type-specific replacement prompt
    let prompt = '';
    const blacklistConstraint = blacklist.length > 0 
      ? `\n\nCRITICAL: DO NOT USE these broken/reported URLs:\n${blacklist.join('\n')}\n` 
      : '';

    switch (resourceType) {
      case 'video':
        prompt = `Find a replacement educational video for "${stepTitle}" in "${discipline}".${blacklistConstraint}

Return JSON:
{
  "url": "YouTube URL (<20 min)",
  "title": "Video title",
  "author": "Channel name",
  "thumbnailUrl": "YouTube thumbnail URL",
  "duration": "MM:SS",
  "whyThisVideo": "Why this is a good replacement",
  "keyMoments": [{"time": "0:00", "label": "Introduction"}]
}`;
        break;

      case 'reading':
        prompt = `Find a replacement academic article/reading for "${stepTitle}" in "${discipline}".${blacklistConstraint}

Return JSON:
{
  "url": "Direct PDF or article URL",
  "domain": "source domain",
  "title": "Article/paper title",
  "snippet": "Brief description",
  "focusHighlight": "What to focus on"
}`;
        break;

      case 'book':
        prompt = `Find a replacement book for "${stepTitle}" in "${discipline}".${blacklistConstraint}

Return JSON:
{
  "title": "Book title",
  "author": "Author name",
  "url": "Archive.org or Project Gutenberg URL",
  "source": "Archive.org / Project Gutenberg",
  "chapterRecommendation": "Specific chapters",
  "why": "Why this book"
}`;
        break;

      case 'podcast':
      case 'mooc':
      case 'article':
      default:
        prompt = `Find a replacement ${resourceType} resource for "${stepTitle}" in "${discipline}".${blacklistConstraint}

Return JSON:
{
  "type": "${resourceType}",
  "url": "Resource URL",
  "title": "Title",
  "source": "Platform/publisher",
  "duration": "Optional duration",
  "author": "Optional author"
}`;
        break;
    }

    prompt += '\n\nReturn ONLY valid JSON, no markdown or explanations.';

    // 4. Call Perplexity for replacement
    const data = await callPerplexityAPI(prompt);
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Perplexity replacement response:', content.substring(0, 300));
    
    const replacement = extractJSON(content);

    // 5. Validate the replacement URL
    if (replacement.url) {
      const isValid = await validateUrl(replacement.url);
      replacement.verified = isValid;
      console.log(`Replacement URL validated: ${isValid ? '✓' : '✗'}`);
    }

    return new Response(JSON.stringify(replacement), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in report-replace-resource:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
