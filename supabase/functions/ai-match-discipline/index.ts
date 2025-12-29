import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Discipline {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
}

interface MatchResult {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
  match_type: 'ai';
  similarity_score: number;
  rationale: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Use the improved fuzzy search RPC to get candidates
    // This handles morphological variants like "Bible" → "Biblical Studies"
    const searchTerm = query.toLowerCase().trim();
    const threshold = searchTerm.length <= 6 ? 0.15 : 0.2; // Lower threshold for AI matching
    
    // First try the fuzzy search function for better candidate gathering
    const { data: fuzzyCandidates, error: fuzzyError } = await supabase
      .rpc('search_disciplines_fuzzy', { 
        search_term: searchTerm,
        similarity_threshold: threshold 
      });

    let allCandidates: Discipline[] = [];
    
    if (!fuzzyError && fuzzyCandidates && fuzzyCandidates.length > 0) {
      console.log(`Fuzzy search found ${fuzzyCandidates.length} candidates for AI matching`);
      allCandidates = fuzzyCandidates;
    } else {
      // Fallback to ILIKE if fuzzy search fails
      console.log('Fuzzy search failed, falling back to ILIKE for candidates');
      const words = searchTerm.split(/\s+/);
      const wordConditions = words.map(word => 
        `l1.ilike.%${word}%,l2.ilike.%${word}%,l3.ilike.%${word}%,l4.ilike.%${word}%,l5.ilike.%${word}%,l6.ilike.%${word}%`
      ).join(',');

      const { data: candidates, error: candidateError } = await supabase
        .from('disciplines')
        .select('*')
        .or(wordConditions)
        .limit(100);

      if (candidateError) {
        console.error('Error fetching candidates:', candidateError);
      }
      allCandidates = candidates || [];
    }
    
    // Add some top-level disciplines for context if we don't have enough
    if (allCandidates.length < 20) {
      const { data: topLevel } = await supabase
        .from('disciplines')
        .select('*')
        .is('l3', null)
        .limit(50);
      
      if (topLevel) {
        const existingIds = new Set(allCandidates.map(c => c.id));
        const newCandidates = topLevel.filter(d => !existingIds.has(d.id));
        allCandidates = [...allCandidates, ...newCandidates].slice(0, 100);
      }
    }

    if (allCandidates.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No disciplines found in catalog' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format candidates for AI
    const candidateList = allCandidates.map((d, i) => {
      const path = [d.l1, d.l2, d.l3, d.l4, d.l5, d.l6].filter(Boolean).join(' > ');
      return `${i + 1}. [ID: ${d.id}] ${path}`;
    }).join('\n');

    // Step 2: Use AI to match query to best disciplines
    const systemPrompt = `You are an academic discipline matcher. Given a user's search query and a list of academic disciplines from a catalog, identify the most relevant disciplines that match what the user is looking for.

IMPORTANT RULES:
1. Only select disciplines that genuinely match the user's intent
2. Consider synonyms, related terms, and conceptual matches (e.g., "Bible" matches "Biblical Studies")
3. Return between 0 and ${limit} matches - don't force matches if none are relevant
4. Provide a confidence score (0.5-1.0) and brief rationale for each match

Respond in JSON format:
{
  "matches": [
    {"id": "uuid", "confidence": 0.95, "rationale": "Brief explanation"},
    ...
  ]
}

If no good matches exist, return {"matches": []}`;

    const userPrompt = `User search query: "${query}"

Available disciplines:
${candidateList}

Find the best matching disciplines for this query.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lovableApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI matching service unavailable', matches: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.content?.[0]?.text || '';
    
    // Parse AI response
    let aiMatches: Array<{ id: string; confidence: number; rationale: string }> = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiMatches = parsed.matches || [];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e, aiContent);
    }

    // Step 3: Map AI selections back to full discipline data
    const candidateMap = new Map(allCandidates.map(d => [d.id, d]));
    const results: MatchResult[] = aiMatches
      .filter(m => candidateMap.has(m.id))
      .slice(0, limit)
      .map(m => {
        const d = candidateMap.get(m.id)!;
        return {
          id: d.id,
          l1: d.l1,
          l2: d.l2,
          l3: d.l3,
          l4: d.l4,
          l5: d.l5,
          l6: d.l6,
          match_type: 'ai' as const,
          similarity_score: m.confidence,
          rationale: m.rationale
        };
      });

    return new Response(
      JSON.stringify({ matches: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-match-discipline:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', matches: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
