/**
 * Analyze a topic to determine its composition and pedagogical pillars
 * Uses Lovable AI for Senior Instructional Designer-level analysis
 */

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

interface TopicCompositionAnalysis {
  compositionType: 'single' | 'composite_program' | 'vocational';
  constituentDisciplines?: string[];
  pillars: TopicPillar[];
  narrativeFlow: string; // Description of how topics should progress
  recommendedSources: string[];
  vocationalFirst: boolean; // Whether to prioritize practical sources
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
            content: `You are a Senior Instructional Designer. Analyze learning topics to design curriculum architecture.

Your job is to decompose topics into PEDAGOGICAL PILLARS - the 4-6 distinct areas that a learner must master.

COMPOSITION TYPES:
1. single - A traditional academic discipline (e.g., "Physics", "History", "Philosophy")
2. composite_program - A degree or program combining multiple disciplines (e.g., "MBA", "Data Science Bootcamp", "Product Management")
3. vocational - A practical skill or craft (e.g., "French Cooking", "Carpentry", "Photography", "Project Management")

For each topic, identify:
1. The composition type
2. 4-6 distinct PEDAGOGICAL PILLARS (not just subject areas, but learning domains)
3. For each pillar: specific search terms to find relevant syllabi
4. Recommended source types (academic vs vocational/practical)
5. A narrative flow describing how the curriculum should progress

EXAMPLES:

Topic: "Project Management"
- Type: vocational
- Pillars:
  1. Methodologies (Agile, Waterfall, PMBOK) - core
  2. Planning & Scheduling (Gantt, CPM/PERT, WBS) - core  
  3. Risk & Stakeholder Management - important
  4. Team Leadership & Communication - important
  5. Tools & Software (MS Project, Jira) - nice-to-have
- Narrative: Start with frameworks/methodologies, then planning tools, then execution skills, finish with practical application
- Vocational First: YES - prioritize Google Certificates, PMI, Coursera over pure academic

Topic: "MBA"
- Type: composite_program
- Pillars:
  1. Strategy & Business Fundamentals - core
  2. Finance & Accounting - core
  3. Marketing & Sales - core
  4. Operations & Supply Chain - important
  5. Leadership & Organizational Behavior - important
  6. Entrepreneurship & Innovation - nice-to-have
- Narrative: Build business fundamentals, then functional expertise, then integration via capstone
- Vocational First: NO - prioritize HBS, Wharton, Stanford over bootcamps

Topic: "Machine Learning"
- Type: single
- Pillars:
  1. Mathematical Foundations (Linear Algebra, Probability) - core
  2. Core Algorithms (Regression, Classification, Clustering) - core
  3. Deep Learning (Neural Networks, CNNs, RNNs) - important
  4. Practical Implementation (Python, TensorFlow) - important
  5. Advanced Topics (NLP, Computer Vision) - nice-to-have
- Narrative: Math foundations first, then classic ML, then deep learning, then practical projects
- Vocational First: NO - prioritize Stanford/MIT courses, but include Coursera specializations

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
  "vocationalFirst": true | false
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
    console.log('[Topic Analysis] Result:', analysis);
    
    // Validate and return
    return {
      compositionType: analysis.compositionType || 'single',
      constituentDisciplines: analysis.constituentDisciplines || [],
      pillars: analysis.pillars || getDefaultPillars(topic),
      narrativeFlow: analysis.narrativeFlow || 'Foundations → Core Concepts → Advanced Topics → Application',
      recommendedSources: analysis.recommendedSources || [],
      vocationalFirst: analysis.vocationalFirst || false
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
    vocationalFirst: false
  };
}
