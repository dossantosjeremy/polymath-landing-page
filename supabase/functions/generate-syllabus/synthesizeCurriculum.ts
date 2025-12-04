/**
 * Curriculum Architect - Synthesizes multiple syllabi into a cohesive curriculum
 * This replaces the aggregation-based mergeSyllabi for ad-hoc topics
 */

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  description?: string;
  isCapstone?: boolean;
  pillar?: string;
  selectionRationale?: string;
  origin?: 'internal' | 'external';
}

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface SourceExtraction {
  source: {
    institution: string;
    courseName: string;
    url: string;
    type: string;
    content?: string;
  };
  modules: Module[];
}

export async function synthesizeCurriculum(
  extractions: SourceExtraction[],
  discipline: string,
  pillars: TopicPillar[],
  narrativeFlow: string,
  apiKey: string
): Promise<{ modules: Module[]; synthesisRationale: string }> {
  try {
    console.log(`[Synthesis] Architecting curriculum from ${extractions.length} sources across ${pillars.length} pillars...`);
    
    // Prepare source summary with pillar mapping
    const sourceDescriptions = extractions.map((ext, idx) => {
      const moduleList = ext.modules.slice(0, 10).map(m => `  - ${m.title}`).join('\n');
      return `
=== Source ${idx + 1}: ${ext.source.institution} - ${ext.source.courseName} ===
URL: ${ext.source.url}
Type: ${ext.source.type}
Modules (showing first 10 of ${ext.modules.length}):
${moduleList}`;
    }).join('\n\n');

    const pillarDescriptions = pillars.map((p, idx) => 
      `${idx + 1}. ${p.name} (${p.priority}) - Search: ${p.searchTerms.slice(0, 2).join(', ')}`
    ).join('\n');

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
            content: `You are a SENIOR INSTRUCTIONAL DESIGNER and CURRICULUM ARCHITECT.
You are NOT a search engine. You do NOT dump all results into a list.
Your job is to DESIGN a learning path, not compile a bibliography.

CRITICAL MINDSET SHIFT:
- A search engine lists everything it finds
- A curriculum architect SELECTS the best and DISCARDS the rest
- You are an EDITOR, not an AGGREGATOR`
          },
          {
            role: 'user',
            content: `Design a comprehensive curriculum for "${discipline}".

PEDAGOGICAL PILLARS TO COVER:
${pillarDescriptions}

NARRATIVE FLOW:
${narrativeFlow}

RAW SOURCE MATERIALS:
${sourceDescriptions}

YOUR TASK AS CURRICULUM ARCHITECT:

PHASE 1 - CLUSTER:
Group all source modules by concept. Put all "Planning" topics together, all "Risk Management" together, etc.

PHASE 2 - SELECT (CRITICAL):
For each cluster, SELECT ONLY THE SINGLE BEST RESOURCE based on:
- Recency (post-2015 preferred)
- Practical application over pure theory
- Quality of pedagogy (clear learning objectives)
- Source authority for this specific topic
DISCARD all inferior duplicates. If you have 3 MIT links for "Planning", PICK ONE and delete the others.

PHASE 3 - SEQUENCE (NARRATIVE):
Arrange selected topics into a "Novice to Expert" progression:
- L1: Foundations (What is this? Why does it matter?)
- L2: Core Tools (The essential skills/frameworks)
- L3: Advanced Execution (Real-world application)
- L4: Capstone (Prove mastery with a project)

CONSTRAINTS:
- Target 8-15 modules MAXIMUM (not 30+)
- Each pillar must be covered by 1-3 modules
- Final output must tell a STORY, not list a bibliography
- Include ONE capstone project at the end (mark isCapstone: true)
- For each module, explain WHY you chose it over alternatives in "selectionRationale"

Return ONLY valid JSON:
{
  "synthesisRationale": "Brief explanation of design decisions",
  "modules": [
    {
      "title": "1. Introduction to [Topic]",
      "tag": "Foundations",
      "source": "Google Project Management Certificate",
      "sourceUrl": "https://coursera.org/...",
      "pillar": "Methodologies",
      "description": "One sentence explaining what this covers",
      "selectionRationale": "Chosen over MIT version because: practical focus, industry credential"
    },
    {
      "title": "2. [Next Topic]",
      "tag": "Core Tools",
      ...
    },
    {
      "title": "Final Project: [Capstone Name]",
      "tag": "Capstone Integration",
      "isCapstone": true,
      "description": "Apply all learned skills to a real-world scenario",
      "selectionRationale": "Synthesized from best practices across sources"
    }
  ]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error(`[Synthesis] API Error: ${response.status}`);
      return fallbackSynthesis(extractions, pillars, discipline);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Synthesis] No JSON found in response');
      return fallbackSynthesis(extractions, pillars, discipline);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed?.modules && Array.isArray(parsed.modules)) {
      console.log(`[Synthesis] ✓ Designed curriculum with ${parsed.modules.length} modules`);
      
      // Ensure all modules have required fields
      const modules = parsed.modules.map((m: any, idx: number) => ({
        ...m,
        title: m.title || `Module ${idx + 1}`,
        tag: m.tag || 'Core Concepts',
        source: m.source || 'Synthesized',
        sourceUrls: m.sourceUrl ? [m.sourceUrl] : [],
        origin: 'external' as const
      }));
      
      return {
        modules,
        synthesisRationale: parsed.synthesisRationale || 'Curriculum designed by AI Architect'
      };
    }
    
    return fallbackSynthesis(extractions, pillars, discipline);
    
  } catch (error) {
    console.error(`[Synthesis] Exception:`, error);
    return fallbackSynthesis(extractions, pillars, discipline);
  }
}

function fallbackSynthesis(
  extractions: SourceExtraction[],
  pillars: TopicPillar[],
  discipline: string
): { modules: Module[]; synthesisRationale: string } {
  console.log('[Synthesis] Using fallback synthesis...');
  
  // Simple fallback: take first few modules from each source, deduplicate
  const seenTitles = new Set<string>();
  const modules: Module[] = [];
  
  // Get modules from each source, limit to 3 per source
  extractions.forEach(ext => {
    ext.modules.slice(0, 3).forEach(m => {
      const normalized = m.title.toLowerCase().replace(/[^a-z]/g, '');
      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        modules.push({
          ...m,
          sourceUrls: [ext.source.url],
          origin: 'external'
        });
      }
    });
  });
  
  // Add a capstone if none exists
  if (!modules.some(m => m.isCapstone)) {
    modules.push({
      title: `Final Project: Apply ${discipline} Skills`,
      tag: 'Capstone Integration',
      source: 'Synthesized',
      description: 'Demonstrate mastery through a practical project',
      isCapstone: true,
      origin: 'external'
    });
  }
  
  return {
    modules: modules.slice(0, 15), // Limit to 15
    synthesisRationale: 'Fallback synthesis: selected representative modules from each source'
  };
}
