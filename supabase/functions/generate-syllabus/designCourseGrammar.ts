/**
 * Course Grammar Design Phase
 * Implements backward design, metalearning mapping, and pedagogical structure
 * This runs BEFORE content discovery to establish course architecture
 */

export type PedagogicalFunction = 
  | 'pre_exposure'           // Schema activation, prior knowledge check
  | 'concept_exposition'      // Core teaching, explain ideas
  | 'expert_demonstration'    // Show mastery in action
  | 'guided_practice'         // Scaffolded doing with feedback
  | 'independent_practice'    // Solo application
  | 'assessment_checkpoint';  // Evidence of mastery

export type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface CourseGrammar {
  // 1. Metalearning Map (Map the Territory)
  metalearning: {
    learnerMotivation: 'intrinsic' | 'extrinsic' | 'mixed';
    knowledgeDecomposition: {
      facts: string[];       // Things to memorize
      concepts: string[];    // Things to deeply understand  
      procedures: string[];  // Things to practice doing
    };
    academicBenchmarks: string[];  // Reference curricula (MIT, Harvard, etc.)
  };
  
  // 2. Mastery Definition (Backward Design)
  masteryOutcome: {
    shortTerm: string;           // By end of course, learner can...
    longTerm: string;            // 6 months later, learner can...
    evidenceOfMastery: string;   // Capstone deliverable description
    capstoneType: 'essay' | 'project' | 'analysis' | 'presentation' | 'portfolio' | 'practical_demonstration';
    cognitiveVerbs: string[];    // Analyze, Create, Evaluate, etc.
  };
  
  // 3. Module Architecture (Emphasize and Exclude)
  moduleIntents: Array<{
    pillarName: string;
    learningIntent: string;       // Why this module exists
    summativeCheckpoint: string;  // How mastery is demonstrated
    emphasize: string[];          // Must cover
    exclude: string[];            // Explicitly omit
  }>;
  
  // 4. Lesson Progression
  lessonGrammar: {
    narrativeArc: string;         // Overall story progression
    bottlenecks: string[];        // Known hard concepts requiring drills
    drillOpportunities: string[]; // Isolated practice areas
    directPracticeContexts: string[]; // "Flight simulator" scenarios
  };
}

export async function designCourseGrammar(
  topic: string,
  pillars: Array<{ name: string; priority: 'core' | 'important' | 'nice-to-have' }>,
  narrativeFlow: string,
  apiKey: string
): Promise<CourseGrammar> {
  try {
    console.log('[Course Grammar] Designing course architecture with backward design...');
    
    const pillarList = pillars.map((p, i) => `${i + 1}. ${p.name} (${p.priority})`).join('\n');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert in ULTRALEARNING methodology and learner-centered course design. Your task is to design course architecture using BACKWARD DESIGN principles.

KEY PRINCIPLES:
1. START FROM MASTERY: Define what the learner should be able to DO at course end BEFORE selecting content
2. METALEARNING: Decompose the subject into Facts (memorize), Concepts (understand), Procedures (practice)
3. CONSTRUCTIVE ALIGNMENT: Learning objectives, activities, and assessments use the same cognitive verbs
4. DIRECTNESS: Prioritize practice contexts that resemble real-world use ("flight simulator" principle)
5. BOTTLENECK FOCUS: Identify likely learning bottlenecks and design drills that isolate them

COGNITIVE VERB HIERARCHY (Bloom's Revised):
- Remember: recall facts, terms, concepts
- Understand: explain ideas, interpret, summarize
- Apply: use information in new situations
- Analyze: draw connections, find patterns, break apart
- Evaluate: justify decisions, make judgments, critique
- Create: produce new work, design, synthesize

Respond ONLY with valid JSON.`
          },
          {
            role: 'user',
            content: `Design the course grammar for: "${topic}"

PEDAGOGICAL PILLARS:
${pillarList}

NARRATIVE FLOW: ${narrativeFlow}

Return JSON with this structure:
{
  "metalearning": {
    "learnerMotivation": "intrinsic" | "extrinsic" | "mixed",
    "knowledgeDecomposition": {
      "facts": ["Fact 1 to memorize", "Fact 2"],
      "concepts": ["Concept 1 to deeply understand", "Concept 2"],
      "procedures": ["Procedure 1 to practice", "Procedure 2"]
    },
    "academicBenchmarks": ["MIT 6.001", "Harvard CS50", etc.]
  },
  "masteryOutcome": {
    "shortTerm": "By end of course, learner can [specific observable behavior]",
    "longTerm": "6 months later, learner can [transfer skill]",
    "evidenceOfMastery": "Complete a [specific capstone deliverable]",
    "capstoneType": "project" | "essay" | "analysis" | "presentation" | "portfolio" | "practical_demonstration",
    "cognitiveVerbs": ["Analyze", "Create", "Evaluate"]
  },
  "moduleIntents": [
    {
      "pillarName": "Pillar Name",
      "learningIntent": "Why this module exists in the curriculum",
      "summativeCheckpoint": "Quiz/draft/analysis/task that proves mastery",
      "emphasize": ["Topic to definitely cover", "Essential concept"],
      "exclude": ["Topic to explicitly omit", "Tangential content"]
    }
  ],
  "lessonGrammar": {
    "narrativeArc": "From X to Y: A journey of...",
    "bottlenecks": ["Common misconception 1", "Difficult concept 2"],
    "drillOpportunities": ["Skill to isolate and practice", "Component to train"],
    "directPracticeContexts": ["Real-world scenario 1", "Flight simulator context 2"]
  }
}`
          }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      console.error('[Course Grammar] API error:', response.status);
      return getDefaultCourseGrammar(topic, pillars, narrativeFlow);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Course Grammar] No content in response');
      return getDefaultCourseGrammar(topic, pillars, narrativeFlow);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Course Grammar] No JSON found in response');
      return getDefaultCourseGrammar(topic, pillars, narrativeFlow);
    }

    const grammar = JSON.parse(jsonMatch[0]);
    console.log('[Course Grammar] ✓ Designed course architecture');
    
    // Validate and fill in missing fields
    return {
      metalearning: {
        learnerMotivation: grammar.metalearning?.learnerMotivation || 'mixed',
        knowledgeDecomposition: {
          facts: grammar.metalearning?.knowledgeDecomposition?.facts || [],
          concepts: grammar.metalearning?.knowledgeDecomposition?.concepts || [],
          procedures: grammar.metalearning?.knowledgeDecomposition?.procedures || [],
        },
        academicBenchmarks: grammar.metalearning?.academicBenchmarks || [],
      },
      masteryOutcome: {
        shortTerm: grammar.masteryOutcome?.shortTerm || `Demonstrate foundational competence in ${topic}`,
        longTerm: grammar.masteryOutcome?.longTerm || `Apply ${topic} knowledge in professional contexts`,
        evidenceOfMastery: grammar.masteryOutcome?.evidenceOfMastery || `Complete a capstone project in ${topic}`,
        capstoneType: grammar.masteryOutcome?.capstoneType || 'project',
        cognitiveVerbs: grammar.masteryOutcome?.cognitiveVerbs || ['Apply', 'Analyze'],
      },
      moduleIntents: grammar.moduleIntents || pillars.map(p => ({
        pillarName: p.name,
        learningIntent: `Develop competence in ${p.name}`,
        summativeCheckpoint: `Assessment covering ${p.name}`,
        emphasize: [],
        exclude: [],
      })),
      lessonGrammar: {
        narrativeArc: grammar.lessonGrammar?.narrativeArc || narrativeFlow,
        bottlenecks: grammar.lessonGrammar?.bottlenecks || [],
        drillOpportunities: grammar.lessonGrammar?.drillOpportunities || [],
        directPracticeContexts: grammar.lessonGrammar?.directPracticeContexts || [],
      },
    };

  } catch (error) {
    console.error('[Course Grammar] Exception:', error);
    return getDefaultCourseGrammar(topic, pillars, narrativeFlow);
  }
}

function getDefaultCourseGrammar(
  topic: string,
  pillars: Array<{ name: string; priority: 'core' | 'important' | 'nice-to-have' }>,
  narrativeFlow: string
): CourseGrammar {
  return {
    metalearning: {
      learnerMotivation: 'mixed',
      knowledgeDecomposition: {
        facts: [`Key terminology in ${topic}`],
        concepts: [`Core principles of ${topic}`],
        procedures: [`Practical application of ${topic}`],
      },
      academicBenchmarks: [],
    },
    masteryOutcome: {
      shortTerm: `Demonstrate foundational competence in ${topic}`,
      longTerm: `Apply ${topic} knowledge in professional contexts`,
      evidenceOfMastery: `Complete a comprehensive project demonstrating ${topic} skills`,
      capstoneType: 'project',
      cognitiveVerbs: ['Apply', 'Analyze', 'Create'],
    },
    moduleIntents: pillars.map(p => ({
      pillarName: p.name,
      learningIntent: `Develop competence in ${p.name}`,
      summativeCheckpoint: `Assessment covering ${p.name}`,
      emphasize: [],
      exclude: [],
    })),
    lessonGrammar: {
      narrativeArc: narrativeFlow,
      bottlenecks: [],
      drillOpportunities: [],
      directPracticeContexts: [],
    },
  };
}

/**
 * Validate that a curriculum satisfies course grammar requirements
 */
export interface CourseGrammarValidation {
  valid: boolean;
  score: number; // 0-100
  violations: string[];
  suggestions: string[];
}

export function validateCourseGrammar(
  modules: Array<{
    title: string;
    isCapstone?: boolean;
    learningObjective?: string;
    pedagogicalFunction?: PedagogicalFunction;
    narrativePosition?: string;
  }>,
  grammar: CourseGrammar
): CourseGrammarValidation {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // 1. Check for mastery evidence (at least one capstone)
  const hasCapstone = modules.some(m => m.isCapstone);
  if (!hasCapstone) {
    violations.push('Missing capstone/evidence of mastery');
    score -= 20;
  }
  
  // 2. Check for learning objectives coverage
  const modulesWithObjectives = modules.filter(m => m.learningObjective && !m.isCapstone);
  const objectiveCoverage = modules.length > 0 
    ? (modulesWithObjectives.length / modules.filter(m => !m.isCapstone).length) * 100 
    : 0;
  
  if (objectiveCoverage < 50) {
    violations.push(`Only ${Math.round(objectiveCoverage)}% of modules have learning objectives`);
    score -= 15;
  } else if (objectiveCoverage < 80) {
    suggestions.push('Consider adding learning objectives to more modules');
    score -= 5;
  }
  
  // 3. Check for pedagogical function distribution
  const functionCounts: Record<string, number> = {};
  modules.forEach(m => {
    if (m.pedagogicalFunction) {
      functionCounts[m.pedagogicalFunction] = (functionCounts[m.pedagogicalFunction] || 0) + 1;
    }
  });
  
  const hasExposition = functionCounts['concept_exposition'] > 0;
  const hasPractice = functionCounts['guided_practice'] > 0 || functionCounts['independent_practice'] > 0;
  
  if (!hasExposition) {
    violations.push('Missing concept exposition phase');
    score -= 15;
  }
  
  if (!hasPractice) {
    suggestions.push('Consider adding guided practice modules');
    score -= 10;
  }
  
  // 4. Check for narrative progression
  const modulesWithNarrative = modules.filter(m => m.narrativePosition);
  if (modulesWithNarrative.length === 0) {
    suggestions.push('Add narrative positioning to improve course coherence');
    score -= 5;
  }
  
  // 5. Check alignment with mastery outcome cognitive verbs
  const cognitiveVerbsUsed = grammar.masteryOutcome.cognitiveVerbs;
  const titlesLower = modules.map(m => m.title.toLowerCase()).join(' ');
  const verbsFound = cognitiveVerbsUsed.filter(verb => 
    titlesLower.includes(verb.toLowerCase())
  );
  
  if (verbsFound.length < cognitiveVerbsUsed.length / 2) {
    suggestions.push(`Consider using more cognitive verbs in module titles: ${cognitiveVerbsUsed.join(', ')}`);
    score -= 5;
  }
  
  return {
    valid: violations.length === 0,
    score: Math.max(0, score),
    violations,
    suggestions,
  };
}
