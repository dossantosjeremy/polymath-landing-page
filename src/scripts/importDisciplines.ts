import { supabase } from "@/integrations/supabase/client";

// This script imports disciplines from the CSV data
export const importDisciplinesFromCSV = async (csvText: string) => {
  try {
    const lines = csvText.split('\n').slice(1); // Skip header
    const disciplines = [];

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
      }
    }

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < disciplines.length; i += batchSize) {
      const batch = disciplines.slice(i, i + batchSize);
      const { error } = await supabase
        .from('disciplines')
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
    }

    return { success: true, count: disciplines.length };
  } catch (error) {
    console.error('Error importing disciplines:', error);
    return { success: false, error };
  }
};
