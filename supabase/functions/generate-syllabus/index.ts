import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  isCapstone?: boolean;
}

interface DiscoveredSource {
  institution: string;
  courseName: string;
  url: string;
  type: string; // "University Course", "Great Books Program", "MOOC", etc.
  content?: string; // NEW: Full original syllabus text
  moduleCount?: number; // NEW: Number of modules in the syllabus
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discipline, selectedSourceUrls } = await req.json();
    console.log('Generating syllabus for:', discipline);
    if (selectedSourceUrls) {
      console.log('Using selected sources:', selectedSourceUrls.length);
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Step 0: Discover all available sources first (unless regenerating with selected sources)
    let discoveredSources: DiscoveredSource[] = [];
    
    if (selectedSourceUrls && selectedSourceUrls.length > 0) {
      // Regenerating with specific sources - create minimal source objects
      console.log('[Regenerate] Using pre-selected sources');
      discoveredSources = selectedSourceUrls.map((url: string) => ({
        url,
        institution: 'Selected Source',
        courseName: 'Regenerating from selected sources',
        type: 'Selected'
      }));
    } else {
      // Initial generation - discover sources
      console.log('[Discovery] Finding all available syllabi sources...');
      discoveredSources = await discoverSources(discipline, PERPLEXITY_API_KEY);
      console.log(`[Discovery] Found ${discoveredSources.length} source(s)`);
    }

    // Step 0.5: Fetch full content for each discovered source
    console.log('[Content Fetch] Fetching full syllabus content from sources...');
    const sourcesWithContent = await Promise.all(
      discoveredSources.map(async (source) => {
        try {
          const content = await fetchSyllabusContent(source.url, discipline, PERPLEXITY_API_KEY);
          return { ...source, content };
        } catch (error) {
          console.error(`[Content Fetch] Failed for ${source.url}:`, error);
          return source; // Return without content if fetch fails
        }
      })
    );
    console.log(`[Content Fetch] Fetched content for ${sourcesWithContent.filter(s => s.content).length} source(s)`);

    // Initialize variables
    let modules: Module[] = [];
    let syllabusSource = '';
    let sourceUrl = '';
    let rawSources: DiscoveredSource[] = sourcesWithContent;

    // Step 0.75: Extract full module lists from each source
    console.log('[Module Extraction] Extracting complete module lists from each source...');
    const extractedSyllabi = await Promise.all(
      sourcesWithContent
        .filter(s => s.content) // Only process sources with content
        .slice(0, 5) // Limit to top 5 sources to avoid rate limits
        .map(async (source) => {
          try {
            const modules = await extractFullSyllabus(source, discipline, PERPLEXITY_API_KEY);
            return { source, modules };
          } catch (error) {
            console.error(`[Module Extraction] Failed for ${source.institution}:`, error);
            return { source, modules: [] };
          }
        })
    );
    
    const validExtractions = extractedSyllabi.filter(e => e.modules.length > 0);
    console.log(`[Module Extraction] Successfully extracted from ${validExtractions.length} source(s)`);

    // If we have multiple extracted syllabi, merge them into a comprehensive syllabus
    if (validExtractions.length > 0) {
      console.log('[Merge] Merging extracted syllabi into comprehensive structure...');
      const mergedModules = await mergeSyllabi(validExtractions, discipline, PERPLEXITY_API_KEY);
      
      if (mergedModules.length >= 4) {
        modules = mergedModules;
        syllabusSource = `Comprehensive syllabus merged from ${validExtractions.length} authoritative source(s)`;
        sourceUrl = validExtractions[0].source.url;
        
        // Weave in capstone milestones
        modules = weaveCapstoneCheckpoints(modules, discipline);

        return new Response(
          JSON.stringify({ 
            discipline,
            modules,
            source: syllabusSource,
            sourceUrl,
            rawSources,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Tier 1: Search for direct syllabus from authoritative academic sources
    const tier1Result = await searchTier1Syllabus(discipline, PERPLEXITY_API_KEY);

    if (tier1Result && tier1Result.modules.length >= 4) {
      console.log('✓ Tier 1 successful: Found syllabus from', tier1Result.source);
      modules = tier1Result.modules;
      syllabusSource = tier1Result.source;
      sourceUrl = tier1Result.sourceUrl || '';
    } else {
      // Tier 2: Aggregate from educational platforms
      console.log('⚠ Tier 1 insufficient, trying Tier 2...');
      const tier2Result = await searchTier2Syllabus(discipline, PERPLEXITY_API_KEY);
      
      if (tier2Result && tier2Result.modules.length >= 4) {
        console.log('✓ Tier 2 successful: Aggregated from online courses');
        modules = tier2Result.modules;
        syllabusSource = tier2Result.source;
        sourceUrl = tier2Result.sourceUrls?.[0] || '';
      } else {
        // Tier 3: Generate using Harvard Backward Design
        console.log('⚠ Tier 2 insufficient, using Tier 3 (AI generation)...');
        const tier3Result = await generateTier3Syllabus(discipline, PERPLEXITY_API_KEY);
        modules = tier3Result.modules;
        syllabusSource = tier3Result.source;
        sourceUrl = tier3Result.sourceUrl || '';
      }
    }

    // Weave in capstone milestones
    modules = weaveCapstoneCheckpoints(modules, discipline);

    // Filter out modules with invalid sourceUrls (not in rawSources)
    const validSourceUrls = new Set(rawSources.map(s => s.url));
    const filteredModules = modules.filter(m => 
      !m.sourceUrl || m.isCapstone || validSourceUrls.has(m.sourceUrl)
    );
    
    if (filteredModules.length < modules.length) {
      console.log(`[Filter] Removed ${modules.length - filteredModules.length} modules with invalid sources`);
    }

    return new Response(
      JSON.stringify({ 
        discipline,
        modules: filteredModules,
        source: syllabusSource,
        sourceUrl,
        rawSources,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-syllabus:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function discoverSources(discipline: string, apiKey: string): Promise<DiscoveredSource[]> {
  try {
    // Check if discipline is philosophy-related for specialized sources
    const isPhilosophy = discipline.toLowerCase().includes('philosophy') || 
                         discipline.toLowerCase().includes('plato') ||
                         discipline.toLowerCase().includes('aristotle') ||
                         discipline.toLowerCase().includes('kant') ||
                         discipline.toLowerCase().includes('ethics');

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
            content: 'You are a syllabus researcher. Find all available syllabi, reading lists, and course outlines for a given topic from authoritative sources. Return valid JSON only.'
          },
          {
            role: 'user',
            content: `Find ALL available syllabi, reading lists, curriculum guides, or course outlines related to "${discipline}".

Search across these AUTHORITATIVE sources in priority order:

**Tier 1A - University OpenCourseWare:**
- Open Syllabus (opensyllabus.org) - Database of millions of real syllabi
- MIT OpenCourseWare (ocw.mit.edu)
- Yale Open Courses (oyc.yale.edu)
- Harvard Extension (pll.harvard.edu)
- Carnegie Mellon OLI (oli.cmu.edu)
- Hillsdale College (hillsdale.edu/online-courses)
- Saylor Academy (saylor.org)

**Tier 1B - Great Books & Classical Programs:**
- St. John's College Great Books (sjc.edu)
- University of Chicago Basic Program (graham.uchicago.edu)
- Great Books Academy (greatbooksacademy.org)
- Sattler College (sattler.edu)
- Harvard Classics (archive.org/details/Harvard-Classics)
${isPhilosophy ? `
**Tier 1C - Philosophy-Specific:**
- The Daily Idea Philosophy Syllabi (thedailyidea.org/philosophy-syllabi-collection)
- Stanford Encyclopedia of Philosophy reading guides` : ''}

**Tier 2 - Quality MOOCs & OER:**
- Coursera (coursera.org)
- edX (edx.org)
- Khan Academy (khanacademy.org)
- OpenLearn (open.edu/openlearn)
- OER Commons (oercommons.org)
- MERLOT (merlot.org)
- OER Project (oerproject.com)

**Tier 3 - Text Repositories:**
- Archive.org educational collections
- Project Gutenberg reading guides

Return ONLY valid JSON with all discovered sources:

{
  "sources": [
    {"institution": "MIT OCW", "courseName": "Exact Course Title", "url": "https://ocw.mit.edu/...", "type": "University OCW"},
    {"institution": "Open Syllabus", "courseName": "Topic from multiple universities", "url": "https://opensyllabus.org/...", "type": "Syllabus Database"},
    {"institution": "St. John's College", "courseName": "Great Books Reading List", "url": "https://sjc.edu/...", "type": "Great Books Program"},
    {"institution": "Carnegie Mellon", "courseName": "OLI Course", "url": "https://oli.cmu.edu/...", "type": "University OCW"},
    {"institution": "Great Books Academy", "courseName": "Syllabus", "url": "https://greatbooksacademy.org/...", "type": "Classical Curriculum"}
  ]
}

Find as many real, authoritative syllabi as possible. Include exact URLs. Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000, // Increased for comprehensive syllabi
        return_citations: true,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.choices?.[0]?.message?.content) {
      console.error('[Discovery] Failed to find sources');
      return [];
    }

    const content = data.choices[0].message.content;
    const parsed = extractJSON(content);
    
    if (parsed?.sources && Array.isArray(parsed.sources)) {
      console.log(`[Discovery] ✓ Found ${parsed.sources.length} sources`);
      return parsed.sources;
    }

    return [];
  } catch (error) {
    console.error('[Discovery] Exception:', error);
    return [];
  }
}

async function fetchSyllabusContent(url: string, discipline: string, apiKey: string): Promise<string> {
  try {
    console.log(`[Content Fetch] Fetching content from ${url}...`);
    
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
            content: 'You are a syllabus content extractor. Extract the complete, verbatim syllabus content from the given URL. Return the full text of the syllabus including all weeks, modules, readings, and topics exactly as they appear.'
          },
          {
            role: 'user',
            content: `Extract the COMPLETE syllabus content from this URL: ${url}

Topic: ${discipline}

Extract and return:
- All week/module titles and topics
- All readings and assignments
- Course descriptions and objectives
- Any additional syllabus content

Return the full syllabus text exactly as it appears on the source page. Include ALL content from the syllabus, not a summary.`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000, // Increased to capture full syllabi
      }),
    });

    if (!response.ok) {
      console.error(`[Content Fetch] API Error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Detect verbose AI responses that indicate no real content was found
    const noContentIndicators = [
      "I appreciate your request",
      "I need to clarify",
      "I cannot provide",
      "search results provided contain only partial",
      "does not contain the complete",
      "I'm unable to",
      "not available in the search results",
      "couldn't find",
      "cannot access the full content",
      "don't have access to"
    ];
    
    const hasNoRealContent = noContentIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasNoRealContent) {
      console.log(`[Content Fetch] ⚠ No real content found for ${url}`);
      return ''; // Return empty string for verbose AI explanations
    }
    
    if (content) {
      console.log(`[Content Fetch] ✓ Fetched ${content.length} characters from ${url}`);
    }
    
    return content;
  } catch (error) {
    console.error(`[Content Fetch] Exception for ${url}:`, error);
    return '';
  }
}

async function extractFullSyllabus(source: DiscoveredSource, discipline: string, apiKey: string): Promise<Module[]> {
  try {
    console.log(`[Extract] Extracting modules from ${source.institution}...`);
    
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
            content: 'You are a syllabus parser. Extract ALL topics from a syllabus and organize them into modules with multiple steps per module. NEVER use "Week" terminology - always use "Module". Return complete JSON only.'
          },
          {
            role: 'user',
            content: `Extract EVERY topic from this syllabus and organize into modules with 3-5 steps each.

Source: ${source.institution} - ${source.courseName}
URL: ${source.url}
Topic: ${discipline}

Syllabus Content:
${source.content}

CRITICAL REQUIREMENTS:
1. PRESERVE the original progression and order of topics from the source
2. ALWAYS use "Module" terminology (NEVER "Week")
3. Group consecutive related topics into logical modules (3-5 steps each)
4. Use format: "Module X - Step Y: Topic"
5. DO NOT reorder topics - maintain the syllabus's pedagogical sequence

EXAMPLE TRANSFORMATION (preserving order):
INPUT: Week 1: Intro, Week 2: Basics, Week 3: Variables, Week 4: Loops, Week 5: Functions
OUTPUT:
- Module 1 - Step 1: Intro
- Module 1 - Step 2: Basics
- Module 1 - Step 3: Variables
- Module 1 - Step 4: Loops
- Module 2 - Step 1: Functions

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [First Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrl": "${source.url}"},
    {"title": "Module 1 - Step 2: [Second Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrl": "${source.url}"},
    {"title": "Module 1 - Step 3: [Third Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrl": "${source.url}"},
    {"title": "Module 2 - Step 1: [Fourth Topic]", "tag": "Core Concepts", "source": "${source.institution}", "sourceUrl": "${source.url}"},
    {"title": "Module 2 - Step 2: [Fifth Topic]", "tag": "Core Concepts", "source": "${source.institution}", "sourceUrl": "${source.url}"}
  ]
}

Include ALL topics in their original order, grouped into modules. Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      console.error(`[Extract] API Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJSON(content);
    
    if (parsed?.modules && Array.isArray(parsed.modules)) {
      console.log(`[Extract] ✓ Extracted ${parsed.modules.length} modules from ${source.institution}`);
      return parsed.modules;
    }
    
    return [];
  } catch (error) {
    console.error(`[Extract] Exception for ${source.institution}:`, error);
    return [];
  }
}

async function mergeSyllabi(
  extractions: Array<{ source: DiscoveredSource; modules: Module[] }>,
  discipline: string,
  apiKey: string
): Promise<Module[]> {
  try {
    console.log(`[Merge] Merging ${extractions.length} syllabi...`);
    
    // Prepare summary of each syllabus
    const syllabusDescriptions = extractions.map((ext, idx) => {
      return `\n=== Syllabus ${idx + 1}: ${ext.source.institution} - ${ext.source.courseName} ===
URL: ${ext.source.url}
Modules (${ext.modules.length}):
${ext.modules.map(m => `- ${m.title}`).join('\n')}`;
    }).join('\n\n');

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
            content: 'You are a curriculum designer. Merge multiple syllabi into one comprehensive syllabus that preserves ALL unique topics while organizing them logically.'
          },
          {
            role: 'user',
            content: `Merge these syllabi into ONE comprehensive syllabus for "${discipline}".

SYLLABI TO MERGE:
${syllabusDescriptions}

REQUIREMENTS:
1. Include ALL unique topics from all syllabi
2. PRESERVE the pedagogical progression from source syllabi (don't arbitrarily reorder)
3. Organize logically into modules: Foundations → Core Concepts → Advanced Topics
4. Remove duplicates but preserve all unique content
5. Use "Module X - Step Y" format (NEVER "Week")
6. Group 3-5 consecutive related steps within each module
7. Aim for ${Math.max(...extractions.map(e => e.modules.length))} or more steps
8. Attribute each step to its source institution
9. ONLY reference sources from the discovered list (no phantom sources)

CRITICAL: Maintain the original learning sequence. Don't jump topics around.

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [First Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrl": "[URL]"},
    {"title": "Module 1 - Step 2: [Second Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrl": "[URL]"},
    {"title": "Module 1 - Step 3: [Third Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrl": "[URL]"},
    {"title": "Module 2 - Step 1: [Fourth Topic]", "tag": "Core Concepts", "source": "[Institution]", "sourceUrl": "[URL]"},
    {"title": "Module 2 - Step 2: [Fifth Topic]", "tag": "Core Concepts", "source": "[Institution]", "sourceUrl": "[URL]"},
    ...more steps (include ALL unique topics in original order, grouped into modules)
  ]
}

Return ONLY the JSON preserving original progression with multiple steps per module.`
          }
        ],
        temperature: 0.2,
        max_tokens: 10000, // Very high limit for comprehensive merging
      }),
    });

    if (!response.ok) {
      console.error(`[Merge] API Error: ${response.status}`);
      // Fallback: concatenate all modules
      return extractions.flatMap(e => e.modules);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJSON(content);
    
    if (parsed?.modules && Array.isArray(parsed.modules)) {
      console.log(`[Merge] ✓ Merged into ${parsed.modules.length} modules`);
      return parsed.modules;
    }
    
    // Fallback: concatenate all modules
    console.log('[Merge] ✗ Failed to parse, concatenating all modules');
    return extractions.flatMap(e => e.modules);
  } catch (error) {
    console.error(`[Merge] Exception:`, error);
    // Fallback: concatenate all modules
    return extractions.flatMap(e => e.modules);
  }
}

async function searchTier1Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 1] Searching authoritative academic sources...');
    
    // Check if discipline is philosophy-related
    const isPhilosophy = discipline.toLowerCase().includes('philosophy') || 
                         discipline.toLowerCase().includes('plato') ||
                         discipline.toLowerCase().includes('aristotle') ||
                         discipline.toLowerCase().includes('kant') ||
                         discipline.toLowerCase().includes('ethics');

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
            content: 'You are a syllabus extractor. Search for real course syllabi, reading lists, and curriculum guides from authoritative academic sources. Extract actual course structures with specific topics. You MUST return valid JSON only, no other text.'
          },
          {
            role: 'user',
            content: `Find a real syllabus, reading list, or curriculum guide for "${discipline}" from these AUTHORITATIVE ACADEMIC SOURCES:

**PRIORITY TIER 1A - University OpenCourseWare:**
- Open Syllabus (opensyllabus.org) - Database of millions of university syllabi
- MIT OpenCourseWare (ocw.mit.edu) - Course syllabi with detailed schedules
- Yale Open Courses (oyc.yale.edu) - Full course syllabi
- Harvard Extension (pll.harvard.edu/catalog) - Professional learning courses
- Carnegie Mellon Open Learning Initiative (oli.cmu.edu) - Structured courses
- Hillsdale College Online (hillsdale.edu/online-courses) - Liberal arts courses
- Saylor Academy (saylor.org) - ACE-accredited courses with syllabi

**PRIORITY TIER 1B - Great Books & Classical Programs:**
- St. John's College Great Books (sjc.edu/academic-programs/undergraduate/great-books-reading-list) - Chronological reading list
- University of Chicago Basic Program (graham.uchicago.edu) - Adult liberal arts program
- Great Books Academy (greatbooksacademy.org) - Complete syllabi PDFs
- Sattler College (sattler.edu/academics) - Humanities reading lists
- Harvard Classics (archive.org/details/Harvard-Classics) - 51-volume reading plan
${isPhilosophy ? `
**PRIORITY TIER 1C - Philosophy-Specific Sources:**
- The Daily Idea (thedailyidea.org/philosophy-syllabi-collection) - Curated philosophy syllabi
- Stanford Encyclopedia of Philosophy - Reading guides and bibliographies` : ''}

**ACCEPTED FORMATS:**
- Week-by-week course schedules with topics
- Module-based structures with learning units
- Reading lists with chronological sequences
- Unit divisions with themes
- Curriculum maps with progression
- Great Books reading orders

**INSTRUCTIONS:**
1. Search the authoritative sources listed above
2. Find an actual syllabus/reading list (NOT hypothetical)
3. Extract the real structure with specific topics/readings IN THEIR ORIGINAL ORDER
4. Include exact URLs to each source
5. Use "Module X - Step Y" format (NEVER "Week")
6. Group 3-5 consecutive related steps within each module
7. Return at least 10 steps organized into logical modules
8. PRESERVE the pedagogical progression from the source

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [EXACT topic from source]", "tag": "Theory", "source": "[Institution]", "sourceUrl": "https://[full-url]"},
    {"title": "Module 1 - Step 2: [EXACT topic]", "tag": "Theory", "source": "[Institution]", "sourceUrl": "https://[full-url]"},
    {"title": "Module 1 - Step 3: [EXACT topic]", "tag": "Theory", "source": "[Institution]", "sourceUrl": "https://[full-url]"},
    {"title": "Module 2 - Step 1: [EXACT topic]", "tag": "Theory", "source": "[Institution]", "sourceUrl": "https://[full-url]"},
    {"title": "Module 2 - Step 2: [EXACT topic]", "tag": "Theory", "source": "[Institution]", "sourceUrl": "https://[full-url]"}
  ],
  "sourceUrl": "https://[main-source-url]"
}

Return ONLY the JSON with 3-5 steps per module. The source MUST be from the authoritative list above.`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000, // Increased for comprehensive syllabi
        return_citations: true,
      }),
    });

    const data = await response.json();
    console.log('[Tier 1] API Status:', response.status);
    
    if (!response.ok) {
      console.error('[Tier 1] API Error:', response.status, data);
      return null;
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 1] No content in response:', JSON.stringify(data, null, 2));
      return null;
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 1] Raw response:', content.substring(0, 500));

    // Try multiple JSON extraction strategies
    const parsed = extractJSON(content);
    
    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length >= 4) {
      console.log(`[Tier 1] ✓ Successfully parsed ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: `Direct syllabus from ${parsed.modules[0]?.source || 'MIT/Yale'}`,
        sourceUrl: parsed.sourceUrl || parsed.modules[0]?.sourceUrl
      };
    }

    console.log('[Tier 1] ✗ Insufficient modules or invalid structure');
    return null;

  } catch (error) {
    console.error('[Tier 1] Exception:', error);
    return null;
  }
}

async function searchTier2Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 2] Searching educational platforms and OER...');
    
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
            content: 'You are a curriculum aggregator. Find real courses from educational platforms and OER repositories, extract their syllabi or course outlines, and aggregate them into a coherent structure. You MUST return valid JSON only.'
          },
          {
            role: 'user',
            content: `Search for courses and curriculum on "${discipline}" from these QUALITY EDUCATIONAL PLATFORMS:

**MOOC Platforms (University-partnered):**
- Coursera (coursera.org) - University courses with syllabi
- edX (edx.org) - University courses from Harvard, MIT, Berkeley, etc.
- Khan Academy (khanacademy.org) - Structured learning progressions
- OpenLearn (open.edu/openlearn) - Open University courses

**Open Educational Resources (OER):**
- OER Commons (oercommons.org) - Curated open courseware
- MERLOT (merlot.org) - Peer-reviewed OER materials
- OER Project (oerproject.com) - Complete structured history curricula
- OpenStax (openstax.org) - Free textbooks with syllabi
- MIT OpenCourseWare (ocw.mit.edu) - If not found in Tier 1
- Yale Open Courses (oyc.yale.edu) - If not found in Tier 1

**Look for:**
- Course syllabi with weekly modules or unit breakdowns
- Learning sequences with clear progression
- Curriculum maps with topics and readings
- Complete course outlines from actual courses

**INSTRUCTIONS:**
1. Find 2-3 real courses from the platforms above
2. Extract their actual syllabus structures IN ORIGINAL ORDER
3. Aggregate into 10+ coherent steps with 3-5 steps per module
4. Use "Module X - Step Y" format (NEVER "Week")
5. Include exact URLs to verify each source
6. PRESERVE the learning progression from source courses

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [Topic]", "tag": "Theory", "source": "[Platform]", "sourceUrl": "https://[url]"},
    {"title": "Module 1 - Step 2: [Topic]", "tag": "Theory", "source": "[Platform]", "sourceUrl": "https://[url]"},
    {"title": "Module 1 - Step 3: [Topic]", "tag": "Theory", "source": "[Platform]", "sourceUrl": "https://[url]"},
    {"title": "Module 2 - Step 1: [Topic]", "tag": "Theory", "source": "[Platform]", "sourceUrl": "https://[url]"},
    {"title": "Module 2 - Step 2: [Topic]", "tag": "Theory", "source": "[Platform]", "sourceUrl": "https://[url]"}
  ],
  "aggregatedFrom": ["https://www.coursera.org/course1", "https://www.edx.org/course2"]
}

Find real courses with actual content. Group 3-5 steps per module. Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        return_citations: true,
      }),
    });

    const data = await response.json();
    console.log('[Tier 2] API Status:', response.status);

    if (!response.ok) {
      console.error('[Tier 2] API Error:', response.status, data);
      return null;
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 2] No content in response');
      return null;
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 2] Raw response:', content.substring(0, 500));

    const parsed = extractJSON(content);

    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length >= 4) {
      console.log(`[Tier 2] ✓ Successfully parsed ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: `Aggregated from ${parsed.aggregatedFrom?.length || 'multiple'} online courses`,
        sourceUrls: parsed.aggregatedFrom
      };
    }

    console.log('[Tier 2] ✗ Insufficient modules or invalid structure');
    return null;

  } catch (error) {
    console.error('[Tier 2] Exception:', error);
    return null;
  }
}

async function generateTier3Syllabus(discipline: string, apiKey: string) {
  try {
    console.log('[Tier 3] Generating with Harvard Backward Design...');
    
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
            content: 'You are a Harvard-trained curriculum designer. Design comprehensive course structures using Backward Design principles from the Harvard Bok Center. You MUST return valid JSON only.'
          },
          {
            role: 'user',
            content: `Design a comprehensive course on "${discipline}" using Harvard Bok Center's Backward Design methodology.

Structure the course using these phases organized into logical modules and steps:
- Module 1 (Foundational Concepts): Build core knowledge through 2-3 steps
- Module 2 (Application & Practice): Apply concepts to problems through 2-3 steps
- Module 3 (Synthesis & Integration): Advanced topics and connections through 2-3 steps

For each step, create specific, detailed learning topics relevant to ${discipline}.

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [Specific foundational topic]", "tag": "Theory", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Module 1 - Step 2: [Core principles]", "tag": "Theory", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Module 2 - Step 1: [Application methods]", "tag": "Application", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Module 2 - Step 2: [Practice & analysis]", "tag": "Application", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Module 3 - Step 1: [Integration concepts]", "tag": "Synthesis", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"},
    {"title": "Module 3 - Step 2: [Synthesis & connections]", "tag": "Synthesis", "source": "Harvard Framework", "sourceUrl": "https://bokcenter.harvard.edu/backward-design"}
  ]
}

Return ONLY the JSON, no other text.`
          }
        ],
        temperature: 0.3,
        max_tokens: 6000, // Increased for comprehensive syllabi
      }),
    });

    const data = await response.json();
    console.log('[Tier 3] API Status:', response.status);

    if (!response.ok) {
      console.error('[Tier 3] API Error:', response.status, data);
      return getFallbackSyllabus(discipline);
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('[Tier 3] No content in response, using fallback');
      return getFallbackSyllabus(discipline);
    }

    const content = data.choices[0].message.content;
    console.log('[Tier 3] Raw response:', content.substring(0, 500));

    const parsed = extractJSON(content);

    if (parsed?.modules && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
      console.log(`[Tier 3] ✓ Successfully generated ${parsed.modules.length} modules`);
      return {
        modules: parsed.modules,
        source: 'AI-generated using Harvard Backward Design Framework',
        sourceUrl: 'https://bokcenter.harvard.edu/backward-design'
      };
    }

    console.log('[Tier 3] ✗ Failed to parse, using fallback');
    return getFallbackSyllabus(discipline);

  } catch (error) {
    console.error('[Tier 3] Exception:', error);
    return getFallbackSyllabus(discipline);
  }
}

function extractJSON(text: string): any {
  try {
    // Strategy 1: Direct JSON parse (if the response is pure JSON)
    try {
      return JSON.parse(text);
    } catch {}

    // Strategy 2: Extract JSON block with regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Strategy 3: Extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }

    console.error('No JSON found in response');
    return null;

  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}

function getFallbackSyllabus(discipline: string) {
  return {
    modules: [
      { title: `Module 1 - Step 1: Introduction to ${discipline}`, tag: 'Theory', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: `Module 1 - Step 2: Foundational Concepts in ${discipline}`, tag: 'Theory', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 2 - Step 1: Core Methodologies', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 2 - Step 2: Practical Applications', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 3 - Step 1: Advanced Techniques & Analysis', tag: 'Application', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 3 - Step 2: Integration & Cross-Disciplinary Connections', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 4 - Step 1: Contemporary Issues & Debates', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
      { title: 'Module 4 - Step 2: Synthesis & Future Directions', tag: 'Synthesis', source: 'Harvard Framework', sourceUrl: 'https://bokcenter.harvard.edu/backward-design' },
    ],
    source: 'AI-generated using Harvard Backward Design Framework',
    sourceUrl: 'https://bokcenter.harvard.edu/backward-design'
  };
}

function weaveCapstoneCheckpoints(modules: Module[], discipline: string): Module[] {
  const totalModules = modules.length;
  const result: Module[] = [];

  for (let i = 0; i < modules.length; i++) {
    result.push(modules[i]);

    // Insert capstone checkpoint at 1/3 mark (planning)
    if (i === Math.floor(totalModules / 3) - 1) {
      result.push({
        title: `Capstone Checkpoint: Project Planning for ${discipline}`,
        tag: 'Capstone Integration',
        source: 'Project Milestone',
        isCapstone: true
      });
    }

    // Insert capstone checkpoint at 2/3 mark (draft)
    if (i === Math.floor(totalModules * 2 / 3) - 1) {
      result.push({
        title: `Capstone Checkpoint: Draft & Peer Review`,
        tag: 'Capstone Integration',
        source: 'Project Milestone',
        isCapstone: true
      });
    }
  }

  // Add final capstone
  result.push({
    title: `Final Capstone: ${discipline} Project Presentation`,
    tag: 'Capstone Integration',
    source: 'Project Milestone',
    isCapstone: true
  });

  return result;
}