import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting discipline import...');

    // Read the CSV file
    const csvPath = new URL('../_shared/academic_disciplines.csv', import.meta.url).pathname;
    const csvText = await Deno.readTextFile(csvPath);
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
      .from('disciplines')
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0) {
      console.log(`Database already contains ${existingCount} disciplines`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Database already populated with ${existingCount} disciplines`,
          count: existingCount 
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
        .from('disciplines')
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`Inserted batch: ${insertedCount}/${disciplines.length}`);
    }

    console.log(`Successfully imported ${insertedCount} disciplines`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully imported disciplines',
        count: insertedCount 
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
