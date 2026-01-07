/**
 * Analyze a topic to determine its composition and pedagogical pillars
 * Uses Lovable AI for Senior Instructional Designer-level analysis
 * Extended with metalearning and mastery definition for Course Grammar
 */

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface KnowledgeDecomposition {
  facts: string[];       // Things to memorize
  concepts: string[];    // Things to deeply understand
  procedures: string[];  // Things to practice doing
}

interface MasteryOutcome {
  shortTerm: string;     // By end of course, learner can...
  longTerm: string;      // 6 months later, learner can...
  capstoneType: 'essay' | 'project' | 'analysis' | 'presentation' | 'portfolio' | 'practical_demonstration';
  cognitiveVerbs: string[]; // Bloom's verbs for objectives
}

interface TopicCompositionAnalysis {
  compositionType: 'single' | 'composite_program' | 'vocational';
  constituentDisciplines?: string[];
  pillars: TopicPillar[];
  narrativeFlow: string; // Description of how topics should progress
  recommendedSources: string[];
  vocationalFirst: boolean; // Whether to prioritize practical sources
  // NEW: Course Grammar elements
  knowledgeDecomposition?: KnowledgeDecomposition;
  masteryOutcome?: MasteryOutcome;
  bottlenecks?: string[]; // Common learning difficulties
  academicBenchmarks?: string[]; // Reference curricula
}

export async function analyzeTopicComposition(
  topic: string,
  lovableApiKey: string
): Promise<TopicCompositionAnalysis> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a Senior Instructional Designer using ULTRALEARNING methodology. Analyze learning topics to design curriculum architecture with BACKWARD DESIGN.

Your job is to:
1. Decompose topics into PEDAGOGICAL PILLARS - the 4-6 distinct areas that a learner must master
2. Apply METALEARNING: Break down the subject into Facts (memorize), Concepts (understand), Procedures (practice)
3. Define MASTERY OUTCOMES: What should the learner be able to DO at course end?
4. Identify BOTTLENECKS: Common misconceptions and difficult concepts

COMPOSITION TYPES:
1. single - A traditional academic discipline (e.g., "Physics", "History", "Philosophy")
2. composite_program - A degree or program combining multiple disciplines (e.g., "MBA", "Data Science Bootcamp")
3. vocational - A practical skill or craft (e.g., "Project Management", "Photography")

COGNITIVE VERB HIERARCHY (Bloom's Revised) - Use these for mastery outcomes:
- Remember: recall facts, terms
- Understand: explain ideas, interpret
- Apply: use in new situations
- Analyze: draw connections, patterns
- Evaluate: justify decisions, critique
- Create: produce new work, synthesize

Respond ONLY with valid JSON.`
          },
          {
            role: 'user',
            content: `Analyze this topic and design its curriculum architecture: "${topic}"

Return JSON with this exact structure:
{
  "compositionType": "single" | "composite_program" | "vocational",
  "constituentDisciplines": ["Discipline 1", "Discipline 2"],
  "pillars": [
    {
      "name": "Pillar Name",
      "searchTerms": ["search term 1", "search term 2"],
      "recommendedSources": ["coursera.org", "mit.edu"],
      "priority": "core" | "important" | "nice-to-have"
    }
  ],
  "narrativeFlow": "Description of how the curriculum should progress from beginner to expert",
  "recommendedSources": ["domain1.com", "domain2.edu"],
  "vocationalFirst": true | false,
  "knowledgeDecomposition": {
    "facts": ["Specific fact to memorize", "Key date or definition"],
    "concepts": ["Core principle to deeply understand", "Theory to grasp"],
    "procedures": ["Skill to practice through doing", "Process to master"]
  },
  "masteryOutcome": {
    "shortTerm": "By end of course, learner can [specific observable action]",
    "longTerm": "6 months later, learner can [transfer skill to real context]",
    "capstoneType": "project" | "essay" | "analysis" | "presentation" | "portfolio" | "practical_demonstration",
    "cognitiveVerbs": ["Analyze", "Create", "Evaluate"]
  },
  "bottlenecks": ["Common misconception 1", "Difficult concept that trips learners"],
  "academicBenchmarks": ["MIT 6.001", "Stanford CS229", "Harvard CS50"]
}`
          }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Topic Analysis] API error:', response.status, errorText);
      return getDefaultAnalysis(topic);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Topic Analysis] No content in response');
      return getDefaultAnalysis(topic);
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Topic Analysis] No JSON found in response');
      return getDefaultAnalysis(topic);
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('[Topic Analysis] Result:', {
      type: analysis.compositionType,
      pillars: analysis.pillars?.length || 0,
      hasKnowledgeDecomp: !!analysis.knowledgeDecomposition,
      hasMastery: !!analysis.masteryOutcome,
      bottlenecks: analysis.bottlenecks?.length || 0
    });
    
    // Validate and return with all new fields
    return {
      compositionType: analysis.compositionType || 'single',
      constituentDisciplines: analysis.constituentDisciplines || [],
      pillars: analysis.pillars || getDefaultPillars(topic),
      narrativeFlow: analysis.narrativeFlow || 'Foundations → Core Concepts → Advanced Topics → Application',
      recommendedSources: analysis.recommendedSources || [],
      vocationalFirst: analysis.vocationalFirst || false,
      // New Course Grammar fields
      knowledgeDecomposition: analysis.knowledgeDecomposition || undefined,
      masteryOutcome: analysis.masteryOutcome || undefined,
      bottlenecks: analysis.bottlenecks || undefined,
      academicBenchmarks: analysis.academicBenchmarks || undefined,
    };

  } catch (error) {
    console.error('[Topic Analysis] Error:', error);
    return getDefaultAnalysis(topic);
  }
}

function getDefaultPillars(topic: string): TopicPillar[] {
  return [
    {
      name: 'Foundations',
      searchTerms: [`${topic} fundamentals`, `introduction to ${topic}`],
      recommendedSources: ['coursera.org', 'edx.org', 'ocw.mit.edu'],
      priority: 'core'
    },
    {
      name: 'Core Concepts',
      searchTerms: [`${topic} core concepts`, `${topic} theory`],
      recommendedSources: ['coursera.org', 'edx.org'],
      priority: 'core'
    },
    {
      name: 'Practical Application',
      searchTerms: [`${topic} practical`, `${topic} hands-on`],
      recommendedSources: ['coursera.org', 'udemy.com'],
      priority: 'important'
    },
    {
      name: 'Advanced Topics',
      searchTerms: [`advanced ${topic}`, `${topic} deep dive`],
      recommendedSources: ['coursera.org', 'ocw.mit.edu'],
      priority: 'nice-to-have'
    }
  ];
}

function getDefaultAnalysis(topic: string): TopicCompositionAnalysis {
  return {
    compositionType: 'single',
    constituentDisciplines: [],
    pillars: getDefaultPillars(topic),
    narrativeFlow: 'Foundations → Core Concepts → Advanced Topics → Application',
    recommendedSources: ['coursera.org', 'edx.org', 'ocw.mit.edu'],
    vocationalFirst: false,
    knowledgeDecomposition: {
      facts: [`Key terminology in ${topic}`],
      concepts: [`Core principles of ${topic}`],
      procedures: [`Practical application of ${topic}`],
    },
    masteryOutcome: {
      shortTerm: `Demonstrate foundational competence in ${topic}`,
      longTerm: `Apply ${topic} knowledge in professional contexts`,
      capstoneType: 'project',
      cognitiveVerbs: ['Apply', 'Analyze'],
    },
    bottlenecks: [],
    academicBenchmarks: [],
  };
}
