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

    if (tier1Result && tier1Result.modules.length >= 4) {
      console.log('Tier 1 successful: Found syllabus from', tier1Result.source);
      modules = tier1Result.modules;
      syllabusSource = tier1Result.source;
    } else {
      // Tier 2: Aggregate from Coursera/edX
      console.log('Tier 1 insufficient, trying Tier 2...');
      const tier2Result = await searchTier2Syllabus(discipline, PERPLEXITY_API_KEY);
      
      if (tier2Result && tier2Result.modules.length >= 4) {
        console.log('Tier 2 successful: Aggregated from online courses');
        modules = tier2Result.modules;
        syllabusSource = tier2Result.source;
      } else {
        // Tier 3: Generate using Harvard Backward Design
        console.log('Tier 2 insufficient, using Tier 3 (AI generation)...');
        const tier3Result = await generateTier3Syllabus(discipline, PERPLEXITY_API_KEY);
        modules = tier3Result.modules;
        syllabusSource = tier3Result.source;
      }
    }

    // Weave in capstone milestones
    modules = weaveCapstoneCheckpoints(modules, discipline);

    return new Response(
      JSON.stringify({ 
        discipline,
        modules,
        source: syllabusSource,
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
    const query = `site:ocw.mit.edu OR site:oyc.yale.edu syllabus "${discipline}" course outline weekly schedule`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a curriculum architect. Extract course syllabi and return structured JSON with module titles, weeks, and topics. Include the exact source URL.'
          },
          {
            role: 'user',
            content: `Search for a syllabus for "${discipline}" from MIT OpenCourseWare or Yale Open Courses. Extract: 1) Module/Week titles, 2) Topics covered, 3) Source URL. Return JSON format: {"modules": [{"title": "Week 1: Topic", "tag": "Theory", "source": "MIT/Yale", "sourceUrl": "https://..."}], "sourceUrl": "https://..."}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        search_domain_filter: ['ocw.mit.edu', 'oyc.yale.edu'],
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.modules && parsed.modules.length >= 4) {
        return {
          modules: parsed.modules,
          source: `Direct syllabus from ${parsed.modules[0].source}`,
          sourceUrl: parsed.sourceUrl
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Tier 1 error:', error);
    return null;
  }
}

async function searchTier2Syllabus(discipline: string, apiKey: string) {
  try {
    const query = `site:coursera.org OR site:edx.org "${discipline}" syllabus modules "what you will learn"`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a curriculum aggregator. Synthesize course syllabi from online platforms into structured modules.'
          },
          {
            role: 'user',
            content: `Find courses on "${discipline}" from Coursera or edX. Aggregate the syllabus content into 6-8 modules. Return JSON: {"modules": [{"title": "Module 1: Topic", "tag": "Theory", "source": "Coursera/edX", "sourceUrl": "https://..."}], "aggregatedFrom": ["url1", "url2"]}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        search_domain_filter: ['coursera.org', 'edx.org'],
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.modules && parsed.modules.length >= 4) {
        return {
          modules: parsed.modules,
          source: `Aggregated from ${parsed.aggregatedFrom?.length || 'multiple'} online courses`,
          sourceUrls: parsed.aggregatedFrom
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Tier 2 error:', error);
    return null;
  }
}

async function generateTier3Syllabus(discipline: string, apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a Harvard-trained curriculum designer using Backward Design principles. Create comprehensive, structured course outlines.'
        },
        {
          role: 'user',
          content: `Design a 6-8 week course on "${discipline}" using Harvard Bok Center's Backward Design principle. Structure: Phase 1 (Weeks 1-2): Core Concepts. Phase 2 (Weeks 3-5): Application & Practice. Phase 3 (Weeks 6-8): Synthesis & Capstone. Return JSON: {"modules": [{"title": "Week 1: Foundation", "tag": "Theory", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"}]}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      modules: parsed.modules || [],
      source: 'AI-generated using Harvard Backward Design Framework',
      sourceUrl: 'https://bokcenter.harvard.edu/backward-design'
    };
  }

  // Fallback basic structure
  return {
    modules: [
      { title: `Week 1: Foundations of ${discipline}`, tag: 'Theory', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Week 2: Core Concepts', tag: 'Theory', source: 'Harvard Framework' },
      { title: 'Week 3: Application Methods', tag: 'Application', source: 'Harvard Framework' },
      { title: 'Week 4: Practice & Analysis', tag: 'Application', source: 'Harvard Framework' },
      { title: 'Week 5: Advanced Techniques', tag: 'Application', source: 'Harvard Framework' },
      { title: 'Week 6: Integration', tag: 'Synthesis', source: 'Harvard Framework' },
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
