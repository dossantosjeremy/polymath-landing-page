import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepTitle, discipline, stepDescription, sourceContent, resources, forceRefresh } = await req.json();

    console.log('Generating step summary for:', { stepTitle, discipline, forceRefresh });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first unless forceRefresh is true
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('step_summaries')
        .select('*')
        .eq('step_title', stepTitle)
        .eq('discipline', discipline)
        .maybeSingle();

      if (cached) {
        console.log('Returning cached summary');
        return new Response(JSON.stringify({ summary: cached.summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate comprehensive reference using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build comprehensive context
    let contextParts = [
      `Step Title: ${stepTitle}`,
      `Discipline: ${discipline}`,
      `Step Description: ${stepDescription || 'Not provided'}`,
    ];

    if (sourceContent && sourceContent.trim()) {
      contextParts.push(`\nOriginal Syllabus Content:\n${sourceContent}`);
    }

    if (resources) {
      if (resources.primaryVideo) {
        contextParts.push(`\nPrimary Video: "${resources.primaryVideo.title}" by ${resources.primaryVideo.author}`);
        contextParts.push(`Video URL: ${resources.primaryVideo.url}`);
        if (resources.primaryVideo.whyThisVideo) {
          contextParts.push(`Why this video: ${resources.primaryVideo.whyThisVideo}`);
        }
      }

      if (resources.deepReading) {
        contextParts.push(`\nDeep Reading: "${resources.deepReading.title}"`);
        contextParts.push(`Reading URL: ${resources.deepReading.url}`);
        contextParts.push(`Focus: ${resources.deepReading.focusHighlight}`);
        contextParts.push(`Snippet: ${resources.deepReading.snippet}`);
      }

      if (resources.book) {
        contextParts.push(`\nRecommended Book: "${resources.book.title}" by ${resources.book.author}`);
        if (resources.book.chapterRecommendation) {
          contextParts.push(`Chapter Recommendation: ${resources.book.chapterRecommendation}`);
        }
        contextParts.push(`Why this book: ${resources.book.why}`);
      }

      if (resources.alternatives && resources.alternatives.length > 0) {
        contextParts.push(`\nAlternative Resources: ${resources.alternatives.length} additional resources available`);
      }
    }

    const fullContext = contextParts.join('\n');

    const systemPrompt = `You are an expert educator creating comprehensive teaching references for self-directed learners. Your role is to synthesize all available information about a learning step into an exhaustive, accurate, and pedagogically sound reference document.

CRITICAL REQUIREMENTS:
1. Be comprehensive and exhaustive - this is a reference document, not a summary
2. Write as if speaking directly to a student (use "you" and conversational but authoritative tone)
3. Include ALL key concepts, theories, and details from the source material
4. Quote or paraphrase verbatim from source syllabi when explaining core concepts
5. Include clickable links to all sources mentioned (format as: [Source Name](URL))
6. Organize content logically with clear sections
7. Prioritize accuracy and completeness over brevity
8. If source material mentions specific readings, thinkers, theories, or frameworks, include them all

OUTPUT FORMAT:
- Start with a brief pedagogical introduction addressing the student
- Present key concepts in depth with citations
- Include all relevant details from source syllabi
- Link to recommended resources with explanations of why they're valuable
- End with guidance on how to approach the material

Remember: This is a comprehensive teaching reference, not a brief overview. Be generous, thorough, and accurate.`;

    const userPrompt = `Create a comprehensive teaching reference for this learning step:

${fullContext}

Generate a thorough reference document that explains everything a student needs to know about this topic. Include all key concepts from the source material, cite and link to sources, and write in a pedagogical tone as if teaching a student directly.`;

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000, // Generous token limit for comprehensive output
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated from AI');
    }

    console.log('Summary generated, caching...');

    // Cache the summary
    const { error: upsertError } = await supabase
      .from('step_summaries')
      .upsert({
        step_title: stepTitle,
        discipline: discipline,
        summary: summary,
      }, {
        onConflict: 'step_title,discipline',
      });

    if (upsertError) {
      console.error('Error caching summary:', upsertError);
      // Don't fail the request if caching fails
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-step-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
