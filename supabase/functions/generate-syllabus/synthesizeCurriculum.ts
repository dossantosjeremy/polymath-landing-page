/**
 * Curriculum Architect - Synthesizes multiple syllabi into a cohesive curriculum
 * Now implements Canonical Academic Course Grammar with backward design,
 * intent-based titles, and pedagogical function assignment.
 */

import type { CourseGrammar, PedagogicalFunction, CognitiveLevel } from './designCourseGrammar.ts';

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
  isAIDiscovered?: boolean;
  // NEW: Pedagogical metadata for Course Grammar
  learningObjective?: string;         // What learner will be able to DO
  pedagogicalFunction?: PedagogicalFunction;
  cognitiveLevel?: CognitiveLevel;
  evidenceOfMastery?: string;         // How learner proves understanding
  bottleneckConcept?: string;         // Known difficulty to drill
  narrativePosition?: string;         // Why this, why now, what next
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
  apiKey: string,
  courseGrammar?: CourseGrammar  // Optional course grammar for enhanced synthesis
): Promise<{ modules: Module[]; synthesisRationale: string }> {
  try {
    console.log(`[Synthesis] Architecting curriculum from ${extractions.length} sources with Course Grammar...`);
    
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

    // Build Course Grammar context if available
    let grammarContext = '';
    if (courseGrammar) {
      const masteryVerbs = courseGrammar.masteryOutcome.cognitiveVerbs.join(', ');
      const bottleneckList = courseGrammar.lessonGrammar.bottlenecks.join(', ') || 'None identified';
      const directContexts = courseGrammar.lessonGrammar.directPracticeContexts.join(', ') || 'General practice';
      
      grammarContext = `
COURSE GRAMMAR (BACKWARD DESIGN):
Mastery Outcome: ${courseGrammar.masteryOutcome.shortTerm}
Evidence of Mastery: ${courseGrammar.masteryOutcome.evidenceOfMastery}
Capstone Type: ${courseGrammar.masteryOutcome.capstoneType}
Required Cognitive Verbs: ${masteryVerbs}
Known Bottlenecks to Address: ${bottleneckList}
Direct Practice Contexts: ${directContexts}
Narrative Arc: ${courseGrammar.lessonGrammar.narrativeArc}

MODULE INTENTS (what each pillar must achieve):
${courseGrammar.moduleIntents.map(mi => 
  `- ${mi.pillarName}: ${mi.learningIntent}\n  Checkpoint: ${mi.summativeCheckpoint}\n  Emphasize: ${mi.emphasize.join(', ') || 'General coverage'}\n  Exclude: ${mi.exclude.join(', ') || 'None specified'}`
).join('\n')}
`;
    }

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
            content: `You are a SENIOR INSTRUCTIONAL DESIGNER and CURRICULUM ARCHITECT using CANONICAL ACADEMIC COURSE GRAMMAR.

You design TAUGHT COURSES, not resource compilations.

CRITICAL MINDSET:
- A search engine lists everything it finds
- A curriculum architect SELECTS the best and DISCARDS the rest
- You are an EDITOR, not an AGGREGATOR
- Every module must have LEARNING INTENT, not just content

PEDAGOGICAL FUNCTIONS (assign one to each module):
- pre_exposure: Schema activation, preview concepts
- concept_exposition: Core teaching, explain ideas deeply
- expert_demonstration: Show mastery in action
- guided_practice: Scaffolded doing with feedback
- independent_practice: Solo application
- assessment_checkpoint: Evidence of mastery

COGNITIVE LEVELS (Bloom's Revised):
- remember: Recall facts
- understand: Explain ideas
- apply: Use in new situations
- analyze: Draw connections
- evaluate: Make judgments
- create: Produce new work

CONSTRUCTIVE ALIGNMENT: Module title verb = Activity verb = Assessment verb`
          },
          {
            role: 'user',
            content: `Design a comprehensive curriculum for "${discipline}" using BACKWARD DESIGN.

PEDAGOGICAL PILLARS TO COVER:
${pillarDescriptions}

NARRATIVE FLOW:
${narrativeFlow}
${grammarContext}
RAW SOURCE MATERIALS:
${sourceDescriptions}

YOUR TASK AS CURRICULUM ARCHITECT:

PHASE 1 - START FROM MASTERY (Backward Design):
Before selecting ANY content, confirm the capstone outcome and work backwards.

PHASE 2 - CLUSTER:
Group all source modules by concept.

PHASE 3 - SELECT (CRITICAL):
For each cluster, SELECT ONLY THE SINGLE BEST RESOURCE based on:
- Alignment with mastery outcome
- Appropriate cognitive level for position in sequence
- Quality of pedagogy
- Source authority

PHASE 4 - ASSIGN PEDAGOGICAL FUNCTION:
Each module gets a specific pedagogical function (pre_exposure, concept_exposition, guided_practice, etc.)

PHASE 5 - CREATE INTENT-BASED TITLES:
Titles must use cognitive verbs: "Analyze X", "Compare Y", "Apply Z"
NOT generic labels like "Introduction" or "Chapter 1"

PHASE 6 - SEQUENCE NARRATIVELY:
Arrange in "Novice to Expert" progression with narrative continuity.

CONSTRAINTS:
- Target 8-15 modules MAXIMUM
- Each module must have a learning objective
- Each module must have a pedagogical function
- Include narrative positioning (why this, why now, what next)
- Final capstone must demonstrate mastery outcome

Return ONLY valid JSON:
{
  "synthesisRationale": "Brief explanation of backward design decisions",
  "modules": [
    {
      "title": "Analyze the Core Principles of [Topic]",
      "tag": "Foundations",
      "source": "MIT OCW",
      "sourceUrl": "https://...",
      "pillar": "Core Concepts",
      "description": "One sentence explaining what this covers",
      "learningObjective": "By end of this module, learner can [specific action verb + object]",
      "pedagogicalFunction": "concept_exposition",
      "cognitiveLevel": "understand",
      "narrativePosition": "Sets foundation for X, prepares learner for Y",
      "selectionRationale": "Chosen over alternatives because..."
    },
    {
      "title": "Apply [Skill] to Real-World Scenarios",
      "tag": "Practice",
      "pedagogicalFunction": "guided_practice",
      "cognitiveLevel": "apply",
      "learningObjective": "Learner can apply [skill] to [context]",
      "narrativePosition": "Builds on exposition, transitions to independence"
    },
    {
      "title": "Create Your [Capstone Deliverable]",
      "tag": "Capstone Integration",
      "isCapstone": true,
      "pedagogicalFunction": "assessment_checkpoint",
      "cognitiveLevel": "create",
      "learningObjective": "Demonstrate mastery by producing [deliverable]",
      "evidenceOfMastery": "Completed [specific artifact]",
      "description": "Apply all learned skills to demonstrate mastery"
    }
  ]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 5000,
      }),
    });

    if (!response.ok) {
      console.error(`[Synthesis] API Error: ${response.status}`);
      return fallbackSynthesis(extractions, pillars, discipline, courseGrammar);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Synthesis] No JSON found in response');
      return fallbackSynthesis(extractions, pillars, discipline, courseGrammar);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed?.modules && Array.isArray(parsed.modules)) {
      console.log(`[Synthesis] ✓ Designed curriculum with ${parsed.modules.length} modules (Course Grammar applied)`);
      
      // Validate and enhance modules with required fields
      const modules = parsed.modules.map((m: any, idx: number) => ({
        ...m,
        title: m.title || `Module ${idx + 1}`,
        tag: m.tag || 'Core Concepts',
        source: m.source || 'Synthesized',
        sourceUrls: m.sourceUrl ? [m.sourceUrl] : [],
        origin: 'external' as const,
        isAIDiscovered: true,
        // Ensure pedagogical fields have defaults
        learningObjective: m.learningObjective || undefined,
        pedagogicalFunction: validatePedagogicalFunction(m.pedagogicalFunction),
        cognitiveLevel: validateCognitiveLevel(m.cognitiveLevel),
        narrativePosition: m.narrativePosition || undefined,
        evidenceOfMastery: m.evidenceOfMastery || undefined,
      }));
      
      return {
        modules,
        synthesisRationale: parsed.synthesisRationale || 'Curriculum designed using backward design principles'
      };
    }
    
    return fallbackSynthesis(extractions, pillars, discipline, courseGrammar);
    
  } catch (error) {
    console.error(`[Synthesis] Exception:`, error);
    return fallbackSynthesis(extractions, pillars, discipline, courseGrammar);
  }
}

function validatePedagogicalFunction(fn: string | undefined): PedagogicalFunction | undefined {
  const valid: PedagogicalFunction[] = [
    'pre_exposure', 'concept_exposition', 'expert_demonstration',
    'guided_practice', 'independent_practice', 'assessment_checkpoint'
  ];
  return fn && valid.includes(fn as PedagogicalFunction) ? fn as PedagogicalFunction : undefined;
}

function validateCognitiveLevel(level: string | undefined): CognitiveLevel | undefined {
  const valid: CognitiveLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  return level && valid.includes(level as CognitiveLevel) ? level as CognitiveLevel : undefined;
}

function fallbackSynthesis(
  extractions: SourceExtraction[],
  pillars: TopicPillar[],
  discipline: string,
  courseGrammar?: CourseGrammar
): { modules: Module[]; synthesisRationale: string } {
  console.log('[Synthesis] Using fallback synthesis with pedagogical defaults...');
  
  // Simple fallback: take first few modules from each source, deduplicate
  const seenTitles = new Set<string>();
  const modules: Module[] = [];
  
  // Assign pedagogical functions in sequence
  const functionSequence: PedagogicalFunction[] = [
    'pre_exposure',
    'concept_exposition', 
    'concept_exposition',
    'guided_practice',
    'concept_exposition',
    'guided_practice',
    'independent_practice',
    'assessment_checkpoint'
  ];
  
  const cognitiveSequence: CognitiveLevel[] = [
    'remember',
    'understand',
    'understand', 
    'apply',
    'analyze',
    'apply',
    'create',
    'evaluate'
  ];
  
  // Get modules from each source, limit to 3 per source
  let moduleIndex = 0;
  extractions.forEach(ext => {
    ext.modules.slice(0, 3).forEach(m => {
      const normalized = m.title.toLowerCase().replace(/[^a-z]/g, '');
      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        modules.push({
          ...m,
          sourceUrls: [ext.source.url],
          origin: 'external',
          isAIDiscovered: true,
          pedagogicalFunction: functionSequence[moduleIndex % functionSequence.length],
          cognitiveLevel: cognitiveSequence[moduleIndex % cognitiveSequence.length],
          learningObjective: `Understand and apply concepts from ${m.title}`,
          narrativePosition: moduleIndex === 0 
            ? 'Foundation for subsequent learning'
            : `Builds on previous modules, preparing for mastery`,
        });
        moduleIndex++;
      }
    });
  });
  
  // Add a capstone if none exists
  if (!modules.some(m => m.isCapstone)) {
    const capstoneType = courseGrammar?.masteryOutcome.capstoneType || 'project';
    const evidenceOfMastery = courseGrammar?.masteryOutcome.evidenceOfMastery || 
      `Complete a comprehensive ${capstoneType} demonstrating ${discipline} skills`;
    
    modules.push({
      title: `Create Your ${discipline} ${capstoneType.charAt(0).toUpperCase() + capstoneType.slice(1)}`,
      tag: 'Capstone Integration',
      source: 'Synthesized',
      description: evidenceOfMastery,
      isCapstone: true,
      origin: 'external',
      isAIDiscovered: true,
      pedagogicalFunction: 'assessment_checkpoint',
      cognitiveLevel: 'create',
      learningObjective: `Demonstrate mastery of ${discipline}`,
      evidenceOfMastery: evidenceOfMastery,
      narrativePosition: 'Final demonstration of all learned skills',
    });
  }
  
  return {
    modules: modules.slice(0, 15),
    synthesisRationale: 'Fallback synthesis: selected representative modules with pedagogical defaults'
  };
}
