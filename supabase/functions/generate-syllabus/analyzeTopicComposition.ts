/**
 * Analyze a topic to determine if it's a single discipline, composite program, or vocational skill
 * Uses Lovable AI for analysis
 */
export async function analyzeTopicComposition(
  topic: string,
  lovableApiKey: string
): Promise<{
  compositionType: 'single' | 'composite_program' | 'vocational';
  constituentDisciplines?: string[];
  recommendedSources?: string[];
}> {
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
            content: `You are an educational curriculum analyzer. Analyze topics to determine their composition type.

COMPOSITION TYPES:
1. single - A traditional academic discipline (e.g., "Physics", "History", "Philosophy")
2. composite_program - A degree or program combining multiple disciplines (e.g., "MBA", "Data Science Bootcamp", "Product Management")
3. vocational - A practical skill or craft (e.g., "French Cooking", "Carpentry", "Photography")

For composite_program types, identify the constituent disciplines.
For vocational types, suggest specific authoritative sources.

Respond ONLY with valid JSON:
{
  "compositionType": "single" | "composite_program" | "vocational",
  "constituentDisciplines": ["Discipline 1", "Discipline 2"],  // only for composite
  "recommendedSources": ["domain1.edu", "domain2.com"]  // only for vocational
}`
          },
          {
            role: 'user',
            content: `Analyze this topic: "${topic}"`
          }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Topic Analysis] API error:', response.status, errorText);
      return { compositionType: 'single' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Topic Analysis] No content in response');
      return { compositionType: 'single' };
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Topic Analysis] No JSON found in response');
      return { compositionType: 'single' };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('[Topic Analysis] Result:', analysis);
    
    return {
      compositionType: analysis.compositionType || 'single',
      constituentDisciplines: analysis.constituentDisciplines,
      recommendedSources: analysis.recommendedSources
    };

  } catch (error) {
    console.error('[Topic Analysis] Error:', error);
    return { compositionType: 'single' };
  }
}
