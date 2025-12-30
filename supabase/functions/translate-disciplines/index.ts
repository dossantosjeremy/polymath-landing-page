import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

interface TranslatedDiscipline {
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
}

type TargetLocale = 'es' | 'fr';

const getTableName = (locale: TargetLocale): string => {
  return locale === 'es' ? 'disciplines_es' : 'disciplines_fr';
};

const getLanguageName = (locale: TargetLocale): string => {
  return locale === 'es' ? 'Spanish' : 'French';
};

async function translateBatch(
  disciplines: Discipline[],
  targetLocale: TargetLocale,
  apiKey: string
): Promise<TranslatedDiscipline[]> {
  const languageName = getLanguageName(targetLocale);
  
  // Build a compact representation for translation
  const termsToTranslate = disciplines.map(d => {
    const terms = [d.l1, d.l2, d.l3, d.l4, d.l5, d.l6].filter(Boolean);
    return terms.join(' > ');
  });

  const prompt = `Translate these academic discipline hierarchies from English to ${languageName}. 
Each line is a hierarchy separated by " > ". 
Return ONLY a JSON array of objects with keys: l1, l2, l3, l4, l5, l6 (use null for missing levels).
Keep the same order. Use proper academic terminology in ${languageName}.

Input:
${termsToTranslate.join('\n')}`;

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
          content: `You are an expert translator specializing in academic terminology. Translate discipline names accurately to ${languageName}, using proper academic conventions. Return only valid JSON.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI translation error:', response.status, errorText);
    throw new Error(`AI translation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  try {
    const translated = JSON.parse(jsonStr);
    if (!Array.isArray(translated)) {
      throw new Error('Response is not an array');
    }
    return translated;
  } catch (e) {
    console.error('Failed to parse translation response:', content);
    throw new Error('Failed to parse AI translation response');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locale, batchSize = 50, offset = 0 } = await req.json();
    
    if (!locale || !['es', 'fr'].includes(locale)) {
      return new Response(
        JSON.stringify({ error: 'Invalid locale. Must be "es" or "fr"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetLocale = locale as TargetLocale;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const tableName = getTableName(targetLocale);

    // Check if target table already has data
    const { count: existingCount } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0 && offset === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Table ${tableName} already has ${existingCount} disciplines`,
          alreadyPopulated: true,
          count: existingCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total count of English disciplines
    const { count: totalCount } = await supabaseClient
      .from('disciplines')
      .select('*', { count: 'exact', head: true });

    // Fetch batch of English disciplines
    const { data: englishDisciplines, error: fetchError } = await supabaseClient
      .from('disciplines')
      .select('id, l1, l2, l3, l4, l5, l6')
      .order('id')
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch disciplines: ${fetchError.message}`);
    }

    if (!englishDisciplines || englishDisciplines.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All disciplines translated',
          completed: true,
          totalTranslated: offset
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Translating batch: ${offset} to ${offset + englishDisciplines.length} of ${totalCount} to ${targetLocale}`);

    // Translate the batch
    const translated = await translateBatch(englishDisciplines, targetLocale, LOVABLE_API_KEY);

    // Insert translated disciplines
    const toInsert = translated.map(t => ({
      l1: t.l1,
      l2: t.l2 || null,
      l3: t.l3 || null,
      l4: t.l4 || null,
      l5: t.l5 || null,
      l6: t.l6 || null,
    }));

    const { error: insertError } = await supabaseClient
      .from(tableName)
      .insert(toInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert translations: ${insertError.message}`);
    }

    const newOffset = offset + englishDisciplines.length;
    const hasMore = newOffset < (totalCount || 0);

    console.log(`Batch complete. Inserted ${translated.length} disciplines. Progress: ${newOffset}/${totalCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        translated: translated.length,
        progress: newOffset,
        total: totalCount,
        hasMore,
        nextOffset: hasMore ? newOffset : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
