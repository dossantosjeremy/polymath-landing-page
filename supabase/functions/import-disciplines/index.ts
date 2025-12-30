import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DisciplineTable = 'disciplines' | 'disciplines_es' | 'disciplines_fr';

const getTableName = (locale: string): DisciplineTable => {
  switch (locale) {
    case 'es': return 'disciplines_es';
    case 'fr': return 'disciplines_fr';
    default: return 'disciplines';
  }
};

const getCsvPath = (locale: string): string => {
  switch (locale) {
    case 'es': return '../_shared/academic_disciplines_es.csv';
    case 'fr': return '../_shared/academic_disciplines_fr.csv';
    default: return '../_shared/academic_disciplines.csv';
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse locale from request body if provided
    let locale = 'en';
    try {
      const body = await req.json();
      if (body.locale) {
        locale = body.locale;
      }
    } catch {
      // No body or invalid JSON - use default locale
    }

    const tableName = getTableName(locale);
    const csvRelativePath = getCsvPath(locale);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log(`Starting discipline import for locale: ${locale}, table: ${tableName}`);

    // Read the CSV file
    const csvPath = new URL(csvRelativePath, import.meta.url).pathname;
    
    let csvText: string;
    try {
      csvText = await Deno.readTextFile(csvPath);
    } catch (e) {
      console.error(`CSV file not found: ${csvPath}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `CSV file for locale '${locale}' not found. Please create ${csvRelativePath} first.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    const lines = csvText.split('\n').slice(1); // Skip header

    console.log(`Found ${lines.length} lines to process`);

    const disciplines = [];
    let processedCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse CSV line, handling quoted fields
      const fields = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const cleanFields = fields.map(f => f.replace(/^"(.*)"$/, '$1').trim());

      const [l1, l2, l3, l4, l5, l6] = cleanFields;

      if (l1) {
        disciplines.push({
          l1,
          l2: l2 || null,
          l3: l3 || null,
          l4: l4 || null,
          l5: l5 || null,
          l6: l6 || null
        });
        processedCount++;
      }
    }

    console.log(`Parsed ${processedCount} disciplines`);

    // Check if disciplines already exist
    const { count: existingCount } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0) {
      console.log(`Database already contains ${existingCount} disciplines for ${locale}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Database already populated with ${existingCount} disciplines for locale '${locale}'`,
          count: existingCount,
          locale
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < disciplines.length; i += batchSize) {
      const batch = disciplines.slice(i, i + batchSize);
      
      const { error } = await supabaseClient
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`Inserted batch: ${insertedCount}/${disciplines.length}`);
    }

    console.log(`Successfully imported ${insertedCount} disciplines for locale ${locale}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported disciplines for locale '${locale}'`,
        count: insertedCount,
        locale
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in import-disciplines function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
