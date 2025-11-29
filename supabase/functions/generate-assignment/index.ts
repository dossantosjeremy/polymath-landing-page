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
  
  const prompt = `You are searching for assignment materials for this course topic:
  
Topic: "${stepTitle}"
Discipline: "${discipline}"
Source URLs: ${urlsString}

Search these course source URLs for assignment pages, problem sets, labs, or projects. Look for:
- /assignments/ pages
- /problem-sets/ pages
- /labs/ pages
- /projects/ pages

For MIT OCW specifically, try transforming /pages/syllabus/ to /pages/assignments/.

If you find assignment materials, extract:
1. Assignment name/title
2. The scenario/context (why this assignment matters)
3. Specific instructions (requirements)
4. Deliverable format (PDF, code, essay, etc.)
5. Estimated time
6. Any attached PDFs or resources with direct links

Return ONLY valid JSON in this exact format:
{
  "found": true,
  "assignmentName": "Problem Set 1: Introduction to X",
  "sourceUrl": "https://...",
  "sourceLabel": "MIT Problem Set 1",
  "scenario": "This assignment helps you apply...",
  "instructions": ["Requirement 1", "Requirement 2"],
  "deliverableFormat": "PDF",
  "estimatedTime": "2 hours",
  "resourceAttachments": [{"title": "Lab Manual", "url": "https://...", "type": "pdf", "pageRef": "pages 4-6"}]
}

If no assignment materials are found, return: {"found": false}`;

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
        max_tokens: 2000,
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
  const prompt = `Search for assignment materials for this topic:

Topic: "${stepTitle}"
Discipline: "${discipline}"

Search these OER repositories for relevant assignments, exercises, or projects:
- oercommons.org
- merlot.org
- curriki.org
- teach.com

Look for high-quality, well-structured assignments that match this topic.

Return ONLY valid JSON in this exact format:
{
  "found": true,
  "assignmentName": "Assignment title",
  "sourceUrl": "https://...",
  "sourceLabel": "OER Commons Assignment",
  "scenario": "This assignment helps you...",
  "instructions": ["Step 1", "Step 2"],
  "deliverableFormat": "Essay/Code/PDF",
  "estimatedTime": "1 hour",
  "resourceAttachments": []
}

If no suitable assignment is found, return: {"found": false}`;

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
        max_tokens: 2000,
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
    'default': { role: 'Subject matter expert', audience: 'Informed general reader', format: 'Written analysis' },
  };

  const mapping = disciplineMapping[discipline] || disciplineMapping['default'];

  const prompt = `You are an instructional designer using Harvard Bok Center Assignment Design principles (https://bokcenter.harvard.edu/assignment-design).

Create a high-quality assignment for this topic:

Topic: "${stepTitle}"
Discipline: "${discipline}"

Design an assignment that follows these principles:
- Clear learning objectives
- Authentic task that simulates real-world application
- Scaffolded complexity appropriate for the topic
- Clear assessment criteria

Role: Act as a ${mapping.role}
Audience: Writing for ${mapping.audience}
Format: ${mapping.format}

Return ONLY valid JSON in this exact format:
{
  "assignmentName": "Practical Application: [Topic]",
  "sourceLabel": "Harvard Bok Framework",
  "scenario": "To master ${stepTitle}, you must apply it in a realistic context. This assignment simulates...",
  "instructions": [
    "Step-by-step requirement 1",
    "Step-by-step requirement 2",
    "Step-by-step requirement 3"
  ],
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
        max_completion_tokens: 2000,
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
