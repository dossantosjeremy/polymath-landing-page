import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepTitle, discipline, sourceUrls = [], forceRefresh = false } = await req.json();

    console.log('Generating assignment for:', { stepTitle, discipline, sourceCount: sourceUrls.length });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('capstone_assignments')
        .select('*')
        .eq('step_title', stepTitle)
        .eq('discipline', discipline)
        .maybeSingle();

      if (cached) {
        console.log('[Cache Hit] Returning cached assignment');
        return new Response(JSON.stringify({ success: true, data: cached }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!perplexityKey || !lovableKey) {
      throw new Error('API keys not configured');
    }

    let assignment: any = null;
    let sourceTier = '';

    // Tier 1: Extraction from original course URLs
    if (sourceUrls.length > 0) {
      console.log('[Tier 1] Attempting extraction from source URLs...');
      assignment = await attemptExtraction(perplexityKey, stepTitle, discipline, sourceUrls);
      if (assignment) {
        sourceTier = 'extraction';
      }
    }

    // Tier 2: OER Repository Search
    if (!assignment) {
      console.log('[Tier 2] Searching OER repositories...');
      assignment = await searchOERRepositories(perplexityKey, stepTitle, discipline);
      if (assignment) {
        sourceTier = 'oer_search';
      }
    }

    // Tier 3: Harvard Bok Center Synthesis
    if (!assignment) {
      console.log('[Tier 3] Generating with Harvard Bok Center principles...');
      assignment = await synthesizeWithBokCenter(lovableKey, stepTitle, discipline);
      sourceTier = 'bok_synthesis';
    }

    if (!assignment) {
      throw new Error('Failed to generate assignment from all tiers');
    }

    // Cache the result
    const { data: savedAssignment, error: saveError } = await supabase
      .from('capstone_assignments')
      .upsert({
        step_title: stepTitle,
        discipline: discipline,
        assignment_name: assignment.assignmentName,
        source_tier: sourceTier,
        source_url: assignment.sourceUrl,
        source_label: assignment.sourceLabel,
        scenario: assignment.scenario,
        instructions: assignment.instructions,
        deliverable_format: assignment.deliverableFormat,
        estimated_time: assignment.estimatedTime,
        role: assignment.role,
        audience: assignment.audience,
        resource_attachments: assignment.resourceAttachments || [],
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error caching assignment:', saveError);
      throw saveError;
    }

    console.log('Assignment generated and cached successfully');

    return new Response(JSON.stringify({ success: true, data: savedAssignment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-assignment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function attemptExtraction(apiKey: string, stepTitle: string, discipline: string, sourceUrls: string[]): Promise<any | null> {
  const urlsString = sourceUrls.slice(0, 3).join(', ');
  
  const prompt = `You are searching for assignment materials for this self-directed learner studying: "${stepTitle}" in ${discipline}.

CRITICAL: This learner has NOT seen any original course syllabus. Create a COMPLETELY STANDALONE assignment that:
- Provides full context and background (assume they only know the topic title)
- Does NOT reference "the course", "your proposal", due dates, or syllabus materials
- Focuses on practical real-world application, not academic submission

Search these URLs for assignment pages, problem sets, labs, or projects:
${urlsString}

Look for /assignments/, /problem-sets/, /labs/, or /projects/ pages.

If found, extract and REWRITE as a standalone assignment with:
1. Assignment name
2. Context/scenario explaining why this matters (2-3 sentences)
3. Instructions as formatted HTML using <h3>, <p>, <ul>, <li>, <strong>
4. Deliverable format
5. Estimated time

Return ONLY valid JSON:
{
  "found": true,
  "assignmentName": "Practical Exercise: [Topic]",
  "sourceUrl": "https://...",
  "sourceLabel": "MIT Assignment",
  "scenario": "This exercise helps you apply [topic] to real-world problems...",
  "instructions": "<h3>Setup</h3><p>Begin by...</p><h3>Requirements</h3><ul><li>Complete...</li></ul>",
  "deliverableFormat": "PDF document",
  "estimatedTime": "2 hours",
  "resourceAttachments": []
}

If not found: {"found": false}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.found ? parsed : null;

  } catch (error) {
    console.error('Tier 1 extraction error:', error);
    return null;
  }
}

async function searchOERRepositories(apiKey: string, stepTitle: string, discipline: string): Promise<any | null> {
  const prompt = `Search for assignment materials for a self-directed learner studying: "${stepTitle}" in ${discipline}.

CRITICAL: The learner has NOT seen any course. Create a STANDALONE assignment:
- Full context and background included
- NO references to "the course" or syllabus
- Practical real-world application focus

Search OER repositories: oercommons.org, merlot.org, curriki.org, teach.com

Return ONLY valid JSON:
{
  "found": true,
  "assignmentName": "Practical Exercise: [Topic]",
  "sourceUrl": "https://...",
  "sourceLabel": "OER Commons",
  "scenario": "This exercise helps you apply [topic] by...",
  "instructions": "<h3>Part 1: Foundation</h3><p>Start by...</p><h3>Part 2: Application</h3><ul><li>Apply...</li></ul>",
  "deliverableFormat": "Written report",
  "estimatedTime": "1.5 hours",
  "resourceAttachments": []
}

If not found: {"found": false}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.found ? parsed : null;

  } catch (error) {
    console.error('Tier 2 OER search error:', error);
    return null;
  }
}

async function synthesizeWithBokCenter(apiKey: string, stepTitle: string, discipline: string): Promise<any> {
  // Map discipline to appropriate role/audience/format
  const disciplineMapping: any = {
    'Philosophy': { role: 'Junior Philosopher', audience: 'Academic journal readers', format: '1000-word analytical essay' },
    'Computer Science': { role: 'Software Engineer', audience: 'Technical team', format: 'Working code with documentation' },
    'History': { role: 'Historian', audience: 'Peer historians', format: '800-word research memo' },
    'Mathematics': { role: 'Applied Mathematician', audience: 'Technical stakeholders', format: 'Problem set with solutions' },
    'Mathematical Logic': { role: 'Logic Researcher', audience: 'Academic peers', format: 'Proof document with explanations' },
    'default': { role: 'Subject matter expert', audience: 'Informed general reader', format: 'Written analysis' },
  };

  const mapping = disciplineMapping[discipline] || disciplineMapping['default'];

  const prompt = `Create a STANDALONE practical assignment for a self-directed learner studying "${stepTitle}" in ${discipline}.

CRITICAL REQUIREMENTS:
- This is a STANDALONE assignment - the learner has NOT seen any course materials
- DO NOT reference "the course", "your proposal", due dates, or Week X
- Provide complete context assuming they only know the topic title
- Focus on REAL-WORLD practical application, not academic submission
- Use Harvard Bok Center principles (authentic task, clear objectives, scaffolded)

Assignment Context:
- Role: Act as a ${mapping.role}
- Audience: Create deliverable for ${mapping.audience}
- Format: ${mapping.format}

Output the instructions as formatted HTML:
- Use <h3> for section headers (e.g., "Background", "Your Task", "Requirements")
- Use <p> for paragraphs
- Use <ul><li> for bulleted lists
- Use <strong> for emphasis
- Keep it clear, practical, and actionable

Return ONLY valid JSON:
{
  "assignmentName": "Practical Application: ${stepTitle}",
  "sourceLabel": "Harvard Bok Framework",
  "scenario": "To master ${stepTitle}, you need to apply it in a realistic context. This assignment simulates a real-world scenario where...",
  "instructions": "<h3>Background</h3><p>Understanding ${stepTitle} requires...</p><h3>Your Task</h3><p>You will...</p><h3>Requirements</h3><ul><li>Analyze...</li><li>Document...</li><li>Present...</li></ul><h3>Deliverable</h3><p>Submit a ${mapping.format} that demonstrates...</p>",
  "deliverableFormat": "${mapping.format}",
  "estimatedTime": "2-3 hours",
  "role": "${mapping.role}",
  "audience": "${mapping.audience}",
  "resourceAttachments": []
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error('Lovable AI error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content from AI');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Tier 3 Bok synthesis error:', error);
    throw error;
  }
}