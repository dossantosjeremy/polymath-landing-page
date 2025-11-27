import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  isCapstone?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discipline } = await req.json();
    console.log('Generating syllabus for:', discipline);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Tier 1: Search for direct syllabus from Yale/MIT
    const tier1Result = await searchTier1Syllabus(discipline, PERPLEXITY_API_KEY);
    
    let modules: Module[] = [];
    let syllabusSource = '';
    let sourceUrl = '';

    if (tier1Result && tier1Result.modules.length >= 4) {
      console.log('✓ Tier 1 successful: Found syllabus from', tier1Result.source);
      modules = tier1Result.modules;
      syllabusSource = tier1Result.source;
      sourceUrl = tier1Result.sourceUrl || '';
    } else {
      // Tier 2: Aggregate from Coursera/edX
      console.log('⚠ Tier 1 insufficient, trying Tier 2...');
      const tier2Result = await searchTier2Syllabus(discipline, PERPLEXITY_API_KEY);
      
      if (tier2Result && tier2Result.modules.length >= 4) {
        console.log('✓ Tier 2 successful: Aggregated from online courses');
        modules = tier2Result.modules;
        syllabusSource = tier2Result.source;
        sourceUrl = tier2Result.sourceUrls?.[0] || '';
      } else {
        // Tier 3: Generate using Harvard Backward Design
        console.log('⚠ Tier 2 insufficient, using Tier 3 (AI generation)...');
        const tier3Result = await generateTier3Syllabus(discipline, PERPLEXITY_API_KEY);
        modules = tier3Result.modules;
        syllabusSource = tier3Result.source;
        sourceUrl = tier3Result.sourceUrl || '';
      }
    }

    // Weave in capstone milestones
    modules = weaveCapstoneCheckpoints(modules, discipline);

    return new Response(
      JSON.stringify({ 
        discipline,
        modules,
        source: syllabusSource,
        sourceUrl,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-syllabus:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchTier1Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 1] Searching MIT OCW and Yale Open Courses...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a syllabus extractor. Search for real course syllabi from MIT OpenCourseWare and Yale Open Courses. Extract the actual week-by-week course structure with specific topics. You MUST return valid JSON only, no other text.'
          },
          {
            role: 'user',
            content: `Find the syllabus for a course on "${discipline}" from MIT OpenCourseWare (ocw.mit.edu) or Yale Open Courses (oyc.yale.edu). 

Extract the week-by-week breakdown with specific topics covered each week. Return ONLY valid JSON in this exact format:

{
  "modules": [
    {"title": "Week 1: [Actual topic from syllabus]", "tag": "Theory", "source": "MIT" or "Yale", "sourceUrl": "https://ocw.mit.edu/..."},
    {"title": "Week 2: [Actual topic]", "tag": "Theory", "source": "MIT" or "Yale", "sourceUrl": "https://ocw.mit.edu/..."}
  ],
  "sourceUrl": "https://ocw.mit.edu/[course-url]"
}

Requirements:
- Find actual syllabi with weekly schedules
- Extract real topic titles from the syllabus
- Include the exact course URL
- Return at least 6 modules
- Return ONLY the JSON, no other text`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        search_domain_filter: ['ocw.mit.edu', 'oyc.yale.edu'],
        return_citations: true,
      }),
    });

    const data = await response.json();
    console.log('[Tier 1] API Status:', response.status);
    
    if (!response.ok) {
      console.error('[Tier 1] API Error:', response.status, data);
      return null;
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 1] No content in response:', JSON.stringify(data, null, 2));
      return null;
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 1] Raw response:', content.substring(0, 500));

    // Try multiple JSON extraction strategies
    const parsed = extractJSON(content);
    
    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length >= 4) {
      console.log(`[Tier 1] ✓ Successfully parsed ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: `Direct syllabus from ${parsed.modules[0]?.source || 'MIT/Yale'}`,
        sourceUrl: parsed.sourceUrl || parsed.modules[0]?.sourceUrl
      };
    }

    console.log('[Tier 1] ✗ Insufficient modules or invalid structure');
    return null;

  } catch (error) {
    console.error('[Tier 1] Exception:', error);
    return null;
  }
}

async function searchTier2Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 2] Searching Coursera and edX...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a curriculum aggregator. Find real courses from Coursera and edX, extract their syllabi, and aggregate them into a coherent structure. You MUST return valid JSON only.'
          },
          {
            role: 'user',
            content: `Search for courses on "${discipline}" from Coursera (coursera.org) and edX (edx.org). Look for course syllabi with weekly modules or learning units.

Aggregate the content into 6-8 modules with specific topics. Return ONLY valid JSON:

{
  "modules": [
    {"title": "Week 1: [Topic from actual course]", "tag": "Theory", "source": "Coursera" or "edX", "sourceUrl": "https://www.coursera.org/..."},
    {"title": "Week 2: [Topic]", "tag": "Theory", "source": "Coursera" or "edX", "sourceUrl": "https://www.coursera.org/..."}
  ],
  "aggregatedFrom": ["https://www.coursera.org/course1", "https://www.edx.org/course2"]
}

Find real courses with actual syllabus structures. Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        search_domain_filter: ['coursera.org', 'edx.org'],
        return_citations: true,
      }),
    });

    const data = await response.json();
    console.log('[Tier 2] API Status:', response.status);

    if (!response.ok) {
      console.error('[Tier 2] API Error:', response.status, data);
      return null;
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 2] No content in response');
      return null;
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 2] Raw response:', content.substring(0, 500));

    const parsed = extractJSON(content);

    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length >= 4) {
      console.log(`[Tier 2] ✓ Successfully parsed ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: `Aggregated from ${parsed.aggregatedFrom?.length || 'multiple'} online courses`,
        sourceUrls: parsed.aggregatedFrom
      };
    }

    console.log('[Tier 2] ✗ Insufficient modules or invalid structure');
    return null;

  } catch (error) {
    console.error('[Tier 2] Exception:', error);
    return null;
  }
}

async function generateTier3Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 3] Generating with Harvard Backward Design...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a Harvard-trained curriculum designer. Design comprehensive course structures using Backward Design principles from the Harvard Bok Center. You MUST return valid JSON only.'
          },
          {
            role: 'user',
            content: `Design a comprehensive 8-week course on "${discipline}" using Harvard Bok Center's Backward Design methodology.

Structure the course using these phases:
- Phase 1 (Weeks 1-2): Foundational Concepts - Build core knowledge
- Phase 2 (Weeks 3-5): Application & Practice - Apply concepts to problems
- Phase 3 (Weeks 6-8): Synthesis & Integration - Advanced topics and connections

For each week, create specific, detailed learning topics relevant to ${discipline}.

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Week 1: [Specific foundational topic]", "tag": "Theory", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 2: [Core principles]", "tag": "Theory", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 3: [Application methods]", "tag": "Application", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 4: [Practice & analysis]", "tag": "Application", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 5: [Advanced application]", "tag": "Application", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 6: [Integration concepts]", "tag": "Synthesis", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 7: [Synthesis & connections]", "tag": "Synthesis", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Week 8: [Advanced synthesis]", "tag": "Synthesis", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"}
  ]
}

Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    console.log('[Tier 3] API Status:', response.status);

    if (!response.ok) {
      console.error('[Tier 3] API Error:', response.status, data);
      return getFallbackSyllabus(discipline);
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 3] No content in response, using fallback');
      return getFallbackSyllabus(discipline);
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 3] Raw response:', content.substring(0, 500));

    const parsed = extractJSON(content);

    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
      console.log(`[Tier 3] ✓ Successfully generated ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: 'AI-generated using Harvard Backward Design Framework',
        sourceUrl: 'https://bokcenter.harvard.edu/backward-design'
      };
    }

    console.log('[Tier 3] ✗ Failed to parse, using fallback');
    return getFallbackSyllabus(discipline);

  } catch (error) {
    console.error('[Tier 3] Exception:', error);
    return getFallbackSyllabus(discipline);
  }
}

function extractJSON(text: string): any {
  try {
    // Strategy 1: Direct JSON parse (if the response is pure JSON)
    try {
      return JSON.parse(text);
    } catch {}

    // Strategy 2: Extract JSON block with regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Strategy 3: Extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }

    console.error('No JSON found in response');
    return null;

  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}

function getFallbackSyllabus(discipline: string) {
  return {
    modules: [
      { title: `Week 1: Introduction to ${discipline}`, tag: 'Theory', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: `Week 2: Foundational Concepts in ${discipline}`, tag: 'Theory', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 3: Core Methodologies', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 4: Practical Applications', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 5: Advanced Techniques & Analysis', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 6: Integration & Cross-Disciplinary Connections', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 7: Contemporary Issues & Debates', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 8: Synthesis & Future Directions', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
    ],
    source: 'AI-generated using Harvard Backward Design Framework',
    sourceUrl: 'https://bokcenter.harvard.edu/backward-design'
  };
}

function weaveCapstoneCheckpoints(modules: Module[], discipline: string): Module[] {
  const totalModules = modules.length;
  const result: Module[] = [];

  for (let i = 0; i < modules.length; i++) {
    result.push(modules[i]);

    // Insert capstone checkpoint at 1/3 mark (planning)
    if (i === Math.floor(totalModules / 3) - 1) {
      result.push({
        title: `Capstone Checkpoint: Project Planning for ${discipline}`,
        tag: 'Capstone Integration',
        source: 'Project Milestone',
        isCapstone: true
      });
    }

    // Insert capstone checkpoint at 2/3 mark (draft)
    if (i === Math.floor(totalModules * 2 / 3) - 1) {
      result.push({
        title: `Capstone Checkpoint: Draft & Peer Review`,
        tag: 'Capstone Integration',
        source: 'Project Milestone',
        isCapstone: true
      });
    }
  }

  // Add final capstone
  result.push({
    title: `Final Capstone: ${discipline} Project Presentation`,
    tag: 'Capstone Integration',
    source: 'Project Milestone',
    isCapstone: true
  });

  return result;
}