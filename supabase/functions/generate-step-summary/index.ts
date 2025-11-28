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
    const { stepTitle, discipline, stepDescription, sourceContent, resources, referenceLength = 'standard', forceRefresh } = await req.json();

    console.log('Generating step summary for:', { stepTitle, discipline, referenceLength, forceRefresh });

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
        .eq('length', referenceLength)
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

    // Adjust prompts and tokens based on reference length
    const lengthConfig = {
      brief: {
        maxTokens: 1500,
        instruction: 'Provide a concise explanation of the core ideas, key arguments, and essential concepts only. Focus on clarity and brevity.'
      },
      standard: {
        maxTokens: 3000,
        instruction: 'Provide a thorough explanation of the subject matter, including key concepts, important thinkers, main arguments, and relevant historical context.'
      },
      comprehensive: {
        maxTokens: 6000,
        instruction: 'Provide an exhaustive exploration of the subject matter, including detailed explanations of concepts, extensive historical and intellectual context, related debates, counterarguments, and concrete examples.'
      }
    };

    const config = lengthConfig[referenceLength as keyof typeof lengthConfig] || lengthConfig.standard;

    const systemPrompt = `You are a subject-matter expert delivering lecture notes on this topic. Your role is to explain the ACTUAL CONTENT—the ideas, theories, arguments, historical context, and key thinkers—as if you were teaching the material in a lecture.

LEVEL: ${referenceLength.toUpperCase()}
${config.instruction}

CRITICAL REQUIREMENTS - WHAT TO INCLUDE:
1. Write as if delivering a lecture to a student (use "you" and conversational but authoritative tone)
2. Explain the actual philosophical/scientific/historical IDEAS and ARGUMENTS from the source material
3. Identify key thinkers and their specific contributions, theories, or positions
4. Provide historical and intellectual context that illuminates the ideas
5. Use concrete examples to illustrate abstract concepts
6. Include clickable links to sources when referencing specific ideas (format as: [Source Name](URL))
7. Organize content logically with clear sections using markdown headers

CRITICAL REQUIREMENTS - WHAT TO EXCLUDE:
1. DO NOT discuss course logistics (reading assignments, page counts, weekly schedules)
2. DO NOT mention grading, participation requirements, or assessment criteria
3. DO NOT include study tips or "how to approach the material" advice
4. DO NOT reference "this course" or "this class" or course structure
5. DO NOT list what the syllabus says—teach what the syllabus is ABOUT

THINK OF THIS AS: "What would a classmate's lecture notes look like?" Focus entirely on the subject matter itself.

OUTPUT FORMAT:
- Use markdown formatting (headers, lists, bold, links)
- Start with context-setting introduction to the topic
- Present key ideas, concepts, and arguments with explanations
- Include relevant thinkers and their contributions
- Provide examples and historical context where appropriate`;

    const userPrompt = `Write lecture notes for: ${stepTitle}

${fullContext}

Explain the ACTUAL SUBJECT MATTER a student needs to understand about this topic. Write as if delivering a lecture—explain the ideas themselves, the key thinkers, their arguments, and the historical/intellectual context. Focus on CONTENT, not course structure or how to study. Think: "What would a classmate's notes from this lecture look like?"`;

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
        max_tokens: config.maxTokens,
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
        length: referenceLength,
        summary: summary,
      }, {
        onConflict: 'step_title,discipline,length',
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
