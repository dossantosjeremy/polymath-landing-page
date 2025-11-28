import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callPerplexityWithThrottle, extractJSON } from "../_shared/perplexity-client.ts";
import { generateLightweightStructure } from "./lightweight-structure.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for rate limiting
const CONFIG = {
  maxSourcesForContentFetch: 3,  // Reduced from 5
  maxSourcesForExtraction: 2,     // Reduced from 5
};

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  description?: string;
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
    const { discipline, selectedSourceUrls, customSources, enabledSources } = await req.json();
    console.log('Generating syllabus for:', discipline);
    if (selectedSourceUrls) {
      console.log('Using selected sources:', selectedSourceUrls.length);
    }
    if (customSources) {
      console.log('Custom sources:', customSources.length);
    }
    if (enabledSources) {
      console.log('Enabled authoritative sources:', enabledSources.length);
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Step 1: Discover all available sources
    let discoveredSources: DiscoveredSource[] = [];
    
    if (selectedSourceUrls && selectedSourceUrls.length > 0) {
      console.log('[Regenerate] Using pre-selected sources');
      discoveredSources = selectedSourceUrls.map((url: string) => ({
        url,
        institution: 'Selected Source',
        courseName: 'Regenerating from selected sources',
        type: 'Selected'
      }));
    } else {
      console.log('[Discovery] Finding all available syllabi sources...');
      discoveredSources = await discoverSources(discipline, PERPLEXITY_API_KEY, customSources, enabledSources);
      console.log(`[Discovery] Found ${discoveredSources.length} source(s)`);
    }

    // Step 2: Generate lightweight syllabus structure (titles + tags only)
    console.log('[Structure] Generating lightweight syllabus structure...');
    const modules = await generateLightweightStructure(discipline, discoveredSources, PERPLEXITY_API_KEY);
    
    if (modules.length === 0) {
      throw new Error('Failed to generate syllabus structure');
    }

    console.log(`[Structure] ✓ Generated ${modules.length} modules`);

    // Return lightweight structure immediately
    return new Response(
      JSON.stringify({ 
        discipline,
        modules,
        source: `Lightweight structure from ${discoveredSources.length} source(s)`,
        sourceUrl: discoveredSources[0]?.url || '',
        rawSources: discoveredSources,
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

async function discoverSources(
  discipline: string, 
  apiKey: string, 
  customSources?: Array<{name: string, url: string, type: string}>,
  enabledSources?: string[]
): Promise<DiscoveredSource[]> {
  try {
    // Check if discipline is philosophy-related for specialized sources
    const isPhilosophy = discipline.toLowerCase().includes('philosophy') || 
                         discipline.toLowerCase().includes('plato') ||
                         discipline.toLowerCase().includes('aristotle') ||
                         discipline.toLowerCase().includes('kant') ||
                         discipline.toLowerCase().includes('ethics');

    // Build source list based on enabled sources
    const allSources = [
      { id: 'open_syllabus', tier: '1A', name: 'Open Syllabus', url: 'opensyllabus.org' },
      { id: 'mit_ocw', tier: '1A', name: 'MIT OpenCourseWare', url: 'ocw.mit.edu' },
      { id: 'yale_oyc', tier: '1A', name: 'Yale Open Courses', url: 'oyc.yale.edu' },
      { id: 'harvard_extension', tier: '1A', name: 'Harvard Extension', url: 'pll.harvard.edu' },
      { id: 'cmu_oli', tier: '1A', name: 'Carnegie Mellon OLI', url: 'oli.cmu.edu' },
      { id: 'hillsdale', tier: '1A', name: 'Hillsdale College', url: 'hillsdale.edu/online-courses' },
      { id: 'saylor', tier: '1A', name: 'Saylor Academy', url: 'saylor.org' },
      { id: 'st_johns', tier: '1B', name: "St. John's College", url: 'sjc.edu' },
      { id: 'uchicago_basic', tier: '1B', name: 'University of Chicago Basic Program', url: 'graham.uchicago.edu' },
      { id: 'great_books_academy', tier: '1B', name: 'Great Books Academy', url: 'greatbooksacademy.org' },
      { id: 'sattler', tier: '1B', name: 'Sattler College', url: 'sattler.edu' },
      { id: 'harvard_classics', tier: '1B', name: 'Harvard Classics', url: 'archive.org/details/Harvard-Classics' },
      { id: 'daily_idea_philosophy', tier: '1C', name: 'The Daily Idea Philosophy Syllabi', url: 'thedailyidea.org/philosophy-syllabi-collection' },
      { id: 'stanford_encyclopedia', tier: '1C', name: 'Stanford Encyclopedia of Philosophy', url: 'plato.stanford.edu' },
      { id: 'coursera', tier: '2', name: 'Coursera', url: 'coursera.org' },
      { id: 'edx', tier: '2', name: 'edX', url: 'edx.org' },
      { id: 'khan_academy', tier: '2', name: 'Khan Academy', url: 'khanacademy.org' },
      { id: 'openlearn', tier: '2', name: 'OpenLearn', url: 'open.edu/openlearn' },
      { id: 'oer_commons', tier: '2', name: 'OER Commons', url: 'oercommons.org' },
      { id: 'merlot', tier: '2', name: 'MERLOT', url: 'merlot.org' },
      { id: 'openstax', tier: '2', name: 'OpenStax', url: 'openstax.org' },
      { id: 'oer_project', tier: '2', name: 'OER Project', url: 'oerproject.com' },
      { id: 'project_gutenberg', tier: '3', name: 'Project Gutenberg', url: 'gutenberg.org' },
      { id: 'archive_org', tier: '3', name: 'Archive.org', url: 'archive.org' },
    ];

    const activeSources = enabledSources && enabledSources.length > 0
      ? allSources.filter(s => enabledSources.includes(s.id))
      : allSources;

    // Build prompt sections
    const tier1A = activeSources.filter(s => s.tier === '1A');
    const tier1B = activeSources.filter(s => s.tier === '1B');
    const tier1C = activeSources.filter(s => s.tier === '1C');
    const tier2 = activeSources.filter(s => s.tier === '2');
    const tier3 = activeSources.filter(s => s.tier === '3');

    const customSection = customSources && customSources.length > 0
      ? `\n**User Custom Sources:**\n${customSources.map(s => `- ${s.name} (${s.url})`).join('\n')}\n`
      : '';

    const data = await callPerplexityWithThrottle({
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
${tier1A.length > 0 ? `
**Tier 1A - University OpenCourseWare:**
${tier1A.map(s => `- ${s.name} (${s.url})`).join('\n')}
` : ''}${tier1B.length > 0 ? `
**Tier 1B - Great Books & Classical Programs:**
${tier1B.map(s => `- ${s.name} (${s.url})`).join('\n')}
` : ''}${tier1C.length > 0 && isPhilosophy ? `
**Tier 1C - Philosophy-Specific:**
${tier1C.map(s => `- ${s.name} (${s.url})`).join('\n')}
` : ''}${tier2.length > 0 ? `
**Tier 2 - Quality MOOCs & OER:**
${tier2.map(s => `- ${s.name} (${s.url})`).join('\n')}
` : ''}${tier3.length > 0 ? `
**Tier 3 - Text Repositories:**
${tier3.map(s => `- ${s.name}`).join('\n')}
` : ''}${customSection}
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
        max_tokens: 8000,
        return_citations: true,
      }, apiKey);

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
      "I apologize",
      "I appreciate your request",
      "I need to clarify",
      "I cannot provide",
      "I cannot extract",
      "I'm unable to",
      "search results provided contain",
      "does not contain the complete",
      "not available in the search results",
      "couldn't find",
      "cannot access",
      "don't have access",
      "To obtain the complete",
      "Visit the URL directly",
      "would need to"
    ];
    
    const hasNoRealContent = noContentIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasNoRealContent) {
      console.log(`[Content Fetch] ⚠ No real content found for ${url}`);
      return '[[EXTRACTION_FAILED]]'; // Return marker for frontend handling
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
6. Include a one-sentence "description" summarizing each topic from the original syllabus
7. ALWAYS return "sourceUrls" as an array for EVERY step, even if single source

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
    {"title": "Module 1 - Step 1: [First Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrls": ["${source.url}"], "description": "One sentence summary of this topic from the syllabus"},
    {"title": "Module 1 - Step 2: [Second Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrls": ["${source.url}"], "description": "One sentence summary of this topic from the syllabus"},
    {"title": "Module 1 - Step 3: [Third Topic]", "tag": "Foundations", "source": "${source.institution}", "sourceUrls": ["${source.url}"], "description": "One sentence summary of this topic from the syllabus"},
    {"title": "Module 2 - Step 1: [Fourth Topic]", "tag": "Core Concepts", "source": "${source.institution}", "sourceUrls": ["${source.url}"], "description": "One sentence summary of this topic from the syllabus"},
    {"title": "Module 2 - Step 2: [Fifth Topic]", "tag": "Core Concepts", "source": "${source.institution}", "sourceUrls": ["${source.url}"], "description": "One sentence summary of this topic from the syllabus"}
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
1. For EVERY step, provide "sourceUrls" as an array listing ALL source syllabi that cover this topic
2. When a topic appears in multiple source syllabi, the "sourceUrls" array MUST include ALL relevant URLs
3. Example: If both MIT and iSchool cover "User Testing", sourceUrls should be ["https://ocw.mit.edu/...", "https://ischool.utexas.edu/..."]
4. ALL discovered sources MUST appear at least once in the final syllabus if they have relevant content
5. NEVER introduce sources that weren't in the original discovered list (no phantom sources)
6. Include ALL unique topics from all syllabi
7. PRESERVE the pedagogical progression from source syllabi (don't arbitrarily reorder)
8. Organize logically into modules: Foundations → Core Concepts → Advanced Topics
9. Remove duplicates but preserve all unique content
10. Use "Module X - Step Y" format (NEVER "Week")
11. Group 3-5 consecutive related steps within each module
12. Aim for ${Math.max(...extractions.map(e => e.modules.length))} or more steps
13. Include a one-sentence "description" for each step

CRITICAL FOR SOURCE ATTRIBUTION:
- Detect overlapping topics across syllabi and attribute ALL contributing sources
- When merging similar topics from multiple syllabi, list ALL source URLs in "sourceUrls" array
- Maintain the original learning sequence while maximizing source coverage

Return ONLY valid JSON:

{
  "modules": [
    {"title": "Module 1 - Step 1: [First Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrls": ["[URL1]", "[URL2]"], "description": "One sentence summary of this topic"},
    {"title": "Module 1 - Step 2: [Second Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrls": ["[URL1]"], "description": "One sentence summary of this topic"},
    {"title": "Module 1 - Step 3: [Third Topic]", "tag": "Foundations", "source": "[Institution]", "sourceUrls": ["[URL1]", "[URL3]"], "description": "One sentence summary of this topic"},
    {"title": "Module 2 - Step 1: [Fourth Topic]", "tag": "Core Concepts", "source": "[Institution]", "sourceUrls": ["[URL2]"], "description": "One sentence summary of this topic"},
    {"title": "Module 2 - Step 2: [Fifth Topic]", "tag": "Core Concepts", "source": "[Institution]", "sourceUrls": ["[URL1]", "[URL2]", "[URL3]"], "description": "One sentence summary of this topic"},
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

// Post-processing function to deduplicate modules by title
function deduplicateModules(modules: Module[]): Module[] {
  console.log('[Deduplication] Checking for duplicate steps...');
  
  const seen = new Map<string, Module>();
  let duplicatesRemoved = 0;
  
  modules.forEach(module => {
    // Normalize title for comparison (lowercase, remove "Module X - Step Y:" prefix)
    const normalizedTitle = module.title
      .replace(/^Module\s+\d+\s*-?\s*Step\s+\d+:\s*/i, '')
      .replace(/^Step\s+\d+:\s*/i, '')
      .replace(/^Week\s+\d+:\s*/i, '')
      .toLowerCase()
      .trim();
    
    if (seen.has(normalizedTitle)) {
      // Duplicate found - merge sourceUrls
      const existing = seen.get(normalizedTitle)!;
      const newUrls = module.sourceUrls || (module.sourceUrl ? [module.sourceUrl] : []);
      const existingUrls = existing.sourceUrls || (existing.sourceUrl ? [existing.sourceUrl] : []);
      existing.sourceUrls = [...new Set([...existingUrls, ...newUrls])];
      duplicatesRemoved++;
    } else {
      // New topic - add to map
      const moduleClone = { ...module };
      // Ensure sourceUrls array is populated
      if (!moduleClone.sourceUrls && moduleClone.sourceUrl) {
        moduleClone.sourceUrls = [moduleClone.sourceUrl];
      }
      seen.set(normalizedTitle, moduleClone);
    }
  });
  
  if (duplicatesRemoved > 0) {
    console.log(`[Deduplication] ✓ Removed ${duplicatesRemoved} duplicate step(s)`);
  } else {
    console.log('[Deduplication] ✓ No duplicates found');
  }
  
  return Array.from(seen.values());
}

// Post-processing function to ensure ALL discovered sources appear in final syllabus
function ensureAllSourcesAppear(modules: Module[], discoveredSources: DiscoveredSource[]): Module[] {
  console.log('[Source Check] Verifying all discovered sources are attributed...');
  
  const usedUrls = new Set<string>();
  modules.forEach(m => {
    if (m.sourceUrl) usedUrls.add(m.sourceUrl);
    if (m.sourceUrls) m.sourceUrls.forEach(url => usedUrls.add(url));
  });
  
  // Find unused source URLs
  const unusedSources = discoveredSources.filter(s => s.url && !usedUrls.has(s.url));
  
  if (unusedSources.length === 0) {
    console.log('[Source Check] ✓ All discovered sources are attributed');
    return modules;
  }
  
  console.log(`[Source Check] ⚠ Found ${unusedSources.length} unattributed source(s), distributing to relevant modules...`);
  
  // Distribute unused sources to relevant non-capstone modules
  // Add to first 3-5 non-capstone modules that don't already have too many sources
  let distributionCount = 0;
  const targetModules = modules
    .filter(m => !m.isCapstone)
    .slice(0, Math.min(10, modules.length)); // First 10 non-capstone modules
  
  unusedSources.forEach((unusedSource, idx) => {
    const targetModule = targetModules[idx % targetModules.length];
    if (targetModule) {
      if (!targetModule.sourceUrls) {
        targetModule.sourceUrls = [];
      }
      if (!targetModule.sourceUrls.includes(unusedSource.url)) {
        targetModule.sourceUrls.push(unusedSource.url);
        usedUrls.add(unusedSource.url);
        distributionCount++;
      }
    }
  });
  
  console.log(`[Source Check] ✓ Distributed ${distributionCount} previously unattributed source(s)`);
  return modules;
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

  // ALWAYS add final capstone (guarantees at least one capstone)
  result.push({
    title: `Final Capstone: ${discipline} Project Presentation`,
    tag: 'Capstone Integration',
    source: 'Project Milestone',
    isCapstone: true
  });

  return result;
}