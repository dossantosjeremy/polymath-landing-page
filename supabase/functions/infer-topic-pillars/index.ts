import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Module {
  title: string;
  tag?: string;
  description?: string;
  isCapstone?: boolean;
}

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface InferenceResult {
  pillars: TopicPillar[];
  narrativeFlow: string;
  compositionType: 'single' | 'composite_program' | 'vocational';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discipline, modules } = await req.json();
    
    if (!discipline || !modules || modules.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing discipline or modules' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Infer Pillars] Analyzing ${modules.length} modules for "${discipline}"`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract module titles and tags for analysis
    const moduleData = modules.map((m: Module) => ({
      title: m.title,
      tag: m.tag || '',
      isCapstone: m.isCapstone || false
    }));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a Senior Instructional Designer analyzing an existing syllabus to identify its pedagogical structure.

Given a list of module titles from a curriculum, your job is to:
1. Identify 4-6 distinct PEDAGOGICAL PILLARS that these modules cover
2. Determine the narrative flow (how topics progress)
3. Classify the composition type

PILLARS should be high-level learning domains, not just module titles. Group related modules together.

For each pillar:
- "core" = Essential to understanding the subject (usually 1-2 pillars)
- "important" = Builds significant competence (usually 2-3 pillars)  
- "nice-to-have" = Advanced or specialized content (usually 1-2 pillars)

Example for "Philosophy of Mind" with modules like "Consciousness", "Intentionality", "Mental Causation", "Self-Knowledge":
- Pillar 1: "Nature of Consciousness" (core) - covers phenomenal experience, qualia
- Pillar 2: "Mental Content & Intentionality" (core) - covers aboutness, mental representation
- Pillar 3: "Mind-Body Problem" (important) - covers dualism, physicalism, mental causation
- Pillar 4: "Self & Personal Identity" (important) - covers self-knowledge, first-person perspective
- Pillar 5: "Contemporary Debates" (nice-to-have) - covers AI, extended mind

Respond ONLY with valid JSON.`
          },
          {
            role: 'user',
            content: `Analyze this existing syllabus and identify its pedagogical pillars:

Discipline: "${discipline}"

Modules:
${moduleData.map((m: { title: string; tag: string; isCapstone: boolean }, i: number) => 
  `${i + 1}. ${m.title}${m.tag ? ` [${m.tag}]` : ''}${m.isCapstone ? ' (Capstone)' : ''}`
).join('\n')}

Return JSON:
{
  "compositionType": "single" | "composite_program" | "vocational",
  "pillars": [
    {
      "name": "Pillar Name",
      "searchTerms": ["related search term 1", "related search term 2"],
      "recommendedSources": ["relevant-domain.edu"],
      "priority": "core" | "important" | "nice-to-have"
    }
  ],
  "narrativeFlow": "Description of how the curriculum progresses"
}`
          }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Infer Pillars] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Infer Pillars] No content in response');
      return new Response(
        JSON.stringify({ error: 'No analysis content returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Infer Pillars] No JSON found in response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis: InferenceResult = JSON.parse(jsonMatch[0]);
    console.log(`[Infer Pillars] Identified ${analysis.pillars.length} pillars: ${analysis.pillars.map(p => p.name).join(', ')}`);

    // Optionally update the community_syllabi cache with the inferred pillars
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.86.0');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update the cached syllabus with inferred pillars
    const { error: updateError } = await supabase
      .from('community_syllabi')
      .update({
        topic_pillars: analysis.pillars,
        narrative_flow: analysis.narrativeFlow,
        composition_type: analysis.compositionType
      })
      .eq('discipline', discipline);

    if (updateError) {
      console.error('[Infer Pillars] Failed to update cache:', updateError);
      // Don't fail - still return the pillars to the frontend
    } else {
      console.log('[Infer Pillars] Successfully updated community cache with pillars');
    }

    return new Response(
      JSON.stringify({
        pillars: analysis.pillars,
        narrativeFlow: analysis.narrativeFlow,
        compositionType: analysis.compositionType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Infer Pillars] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
