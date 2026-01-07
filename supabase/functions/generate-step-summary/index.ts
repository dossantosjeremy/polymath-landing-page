import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Resource {
  url: string;
  title: string;
  author?: string;
  duration?: string;
  domain?: string;
  snippet?: string;
  type?: string;
}

// Fetch additional context from Perplexity for rich content
async function fetchPerplexityContext(
  topic: string, 
  discipline: string,
  learningObjective?: string
): Promise<{ context: string; citations: string[] }> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    console.log('[Perplexity] API key not configured, skipping enrichment');
    return { context: '', citations: [] };
  }

  try {
    console.log('[Perplexity] Fetching context for:', topic);
    
    const searchPrompt = learningObjective 
      ? `Provide comprehensive academic information about "${topic}" in the context of ${discipline}. Focus on: ${learningObjective}. Include key concepts, historical context, important thinkers, practical applications, and common misconceptions.`
      : `Provide comprehensive academic information about "${topic}" in the context of ${discipline}. Include key concepts, historical context, important thinkers, practical applications, and common misconceptions.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are an academic researcher providing comprehensive, well-cited information. Include specific facts, dates, names, and concepts. Be thorough and scholarly.'
          },
          { role: 'user', content: searchPrompt }
        ],
        search_recency_filter: 'year',
      }),
    });

    if (!response.ok) {
      console.error('[Perplexity] API error:', response.status);
      return { context: '', citations: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log('[Perplexity] Got context:', content.substring(0, 200) + '...');
    console.log('[Perplexity] Citations:', citations.length);
    
    return { context: content, citations };
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return { context: '', citations: [] };
  }
}

// Fetch additional academic sources for inline citations
async function fetchAcademicSources(
  topic: string,
  discipline: string
): Promise<{ sources: Array<{ title: string; url: string; snippet: string }> }> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    return { sources: [] };
  }

  try {
    console.log('[Perplexity] Fetching academic sources for:', topic);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'Find authoritative academic sources about the topic. Return a JSON array of sources with title, url, and a brief snippet. Focus on .edu domains, academic journals, and authoritative publications.'
          },
          { role: 'user', content: `Find 3-5 authoritative academic sources about "${topic}" in ${discipline}. Return JSON: [{"title": "...", "url": "...", "snippet": "..."}]` }
        ],
        search_mode: 'academic',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sources',
            schema: {
              type: 'object',
              properties: {
                sources: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      url: { type: 'string' },
                      snippet: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }),
    });

    if (!response.ok) {
      console.error('[Perplexity] Academic sources error:', response.status);
      return { sources: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(content);
      console.log('[Perplexity] Found academic sources:', parsed.sources?.length || 0);
      return { sources: parsed.sources || [] };
    } catch {
      console.log('[Perplexity] Could not parse academic sources');
      return { sources: [] };
    }
  } catch (error) {
    console.error('[Perplexity] Academic sources error:', error);
    return { sources: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      stepTitle, 
      discipline, 
      stepDescription, 
      sourceContent, 
      resources, 
      referenceLength = 'standard', 
      forceRefresh, 
      locale = 'en',
      learningObjective,
      pedagogicalFunction,
      cognitiveLevel,
      narrativePosition,
      evidenceOfMastery
    } = await req.json();

    console.log('Generating step summary for:', { 
      stepTitle, 
      discipline, 
      referenceLength, 
      forceRefresh, 
      locale,
      hasPedagogicalMeta: !!(learningObjective || pedagogicalFunction),
      hasResources: !!(resources?.coreVideos?.length || resources?.coreReadings?.length)
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French'
    };
    const targetLanguage = languageNames[locale] || 'English';

    // Check cache first unless forceRefresh is true
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('step_summaries')
        .select('*')
        .eq('step_title', stepTitle)
        .eq('discipline', discipline)
        .eq('length', referenceLength)
        .eq('locale', locale)
        .maybeSingle();

      if (cached) {
        console.log('Returning cached summary for locale:', locale);
        return new Response(JSON.stringify({ summary: cached.summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch rich context from Perplexity (multiple calls for depth)
    console.log('[Summary] Fetching Perplexity enrichment...');
    
    const [perplexityContext, academicSources] = await Promise.all([
      fetchPerplexityContext(stepTitle, discipline, learningObjective),
      fetchAcademicSources(stepTitle, discipline)
    ]);

    // Build comprehensive context including pedagogical metadata
    let contextParts = [
      `Step Title: ${stepTitle}`,
      `Discipline: ${discipline}`,
      `Step Description: ${stepDescription || 'Not provided'}`,
    ];

    // Add Perplexity enrichment
    if (perplexityContext.context) {
      contextParts.push('\n--- ENRICHED CONTEXT (from research) ---');
      contextParts.push(perplexityContext.context);
      if (perplexityContext.citations.length > 0) {
        contextParts.push('\nResearch Citations:');
        perplexityContext.citations.forEach((citation, i) => {
          contextParts.push(`[${i + 1}] ${citation}`);
        });
      }
      contextParts.push('--- END ENRICHED CONTEXT ---\n');
    }

    // Add academic sources for inline citations
    if (academicSources.sources.length > 0) {
      contextParts.push('\n--- ACADEMIC SOURCES (use for inline citations) ---');
      academicSources.sources.forEach((source, i) => {
        contextParts.push(`[Source ${i + 1}] "${source.title}" - ${source.url}`);
        contextParts.push(`   ${source.snippet}`);
      });
      contextParts.push('--- END ACADEMIC SOURCES ---\n');
    }

    // Add Course Grammar pedagogical context if available
    if (learningObjective || pedagogicalFunction || narrativePosition) {
      contextParts.push('\n--- PEDAGOGICAL CONTEXT (Course Grammar) ---');
      
      if (learningObjective) {
        contextParts.push(`Learning Objective: ${learningObjective}`);
      }
      
      if (pedagogicalFunction) {
        const functionDescriptions: Record<string, string> = {
          'pre_exposure': 'This is a PRE-EXPOSURE module: activate prior knowledge, preview key concepts',
          'concept_exposition': 'This is a CONCEPT EXPOSITION module: explain ideas deeply, build understanding',
          'expert_demonstration': 'This is an EXPERT DEMONSTRATION module: show mastery in action, model expert thinking',
          'guided_practice': 'This is a GUIDED PRACTICE module: scaffold learner doing with feedback',
          'independent_practice': 'This is an INDEPENDENT PRACTICE module: learner applies solo',
          'assessment_checkpoint': 'This is an ASSESSMENT CHECKPOINT: evidence of mastery'
        };
        contextParts.push(`Pedagogical Function: ${functionDescriptions[pedagogicalFunction] || pedagogicalFunction}`);
      }
      
      if (cognitiveLevel) {
        const levelDescriptions: Record<string, string> = {
          'remember': 'Focus on RECALL: facts, terms, definitions',
          'understand': 'Focus on EXPLANATION: interpret, summarize, paraphrase',
          'apply': 'Focus on APPLICATION: use in new situations',
          'analyze': 'Focus on ANALYSIS: draw connections, find patterns',
          'evaluate': 'Focus on EVALUATION: justify, critique, assess',
          'create': 'Focus on CREATION: produce, design, synthesize new work'
        };
        contextParts.push(`Cognitive Level: ${levelDescriptions[cognitiveLevel] || cognitiveLevel}`);
      }
      
      if (narrativePosition) {
        contextParts.push(`Narrative Position: ${narrativePosition}`);
      }
      
      if (evidenceOfMastery) {
        contextParts.push(`Evidence of Mastery: ${evidenceOfMastery}`);
      }
      
      contextParts.push('--- END PEDAGOGICAL CONTEXT ---\n');
    }

    if (sourceContent && sourceContent.trim()) {
      contextParts.push(`\nOriginal Syllabus Content:\n${sourceContent}`);
    }

    // Build embedded resources section for the AI to reference
    let embeddedResourcesInfo = '';
    if (resources) {
      const coreVideos = resources.coreVideos || [];
      const coreReadings = resources.coreReadings || [];
      const lessons = resources.lessons || [];

      if (coreVideos.length > 0 || coreReadings.length > 0 || lessons.length > 0) {
        embeddedResourcesInfo = '\n--- RESOURCES TO EMBED IN NARRATIVE ---\n';
        embeddedResourcesInfo += 'You MUST embed these resources at pedagogically appropriate moments in your prose.\n';
        embeddedResourcesInfo += 'Use the exact format shown for each resource type.\n\n';

        coreVideos.forEach((video: Resource, i: number) => {
          embeddedResourcesInfo += `VIDEO ${i + 1}: "${video.title}"`;
          if (video.author) embeddedResourcesInfo += ` by ${video.author}`;
          if (video.duration) embeddedResourcesInfo += ` (${video.duration})`;
          embeddedResourcesInfo += `\n  URL: ${video.url}\n`;
          embeddedResourcesInfo += `  To embed, write: <div class="embedded-resource" data-type="video" data-index="${i}"></div>\n\n`;
        });

        coreReadings.forEach((reading: Resource, i: number) => {
          embeddedResourcesInfo += `READING ${i + 1}: "${reading.title}"`;
          if (reading.domain) embeddedResourcesInfo += ` (${reading.domain})`;
          embeddedResourcesInfo += `\n  URL: ${reading.url}\n`;
          if (reading.snippet) embeddedResourcesInfo += `  Preview: ${reading.snippet}\n`;
          embeddedResourcesInfo += `  To embed, write: <div class="embedded-resource" data-type="reading" data-index="${i}"></div>\n\n`;
        });

        lessons.forEach((lesson: Resource, i: number) => {
          embeddedResourcesInfo += `LESSON ${i + 1}: "${lesson.title}"`;
          if (lesson.author) embeddedResourcesInfo += ` by ${lesson.author}`;
          if (lesson.duration) embeddedResourcesInfo += ` (${lesson.duration})`;
          embeddedResourcesInfo += `\n  URL: ${lesson.url}\n`;
          if (lesson.snippet) embeddedResourcesInfo += `  Preview: ${lesson.snippet}\n`;
          embeddedResourcesInfo += `  To embed, write: <div class="embedded-resource" data-type="lesson" data-index="${i}"></div>\n\n`;
        });

        embeddedResourcesInfo += '--- END RESOURCES ---\n';
        contextParts.push(embeddedResourcesInfo);
      }
    }

    const fullContext = contextParts.join('\n');

    // Adjust tokens based on reference length
    const lengthConfig = {
      brief: {
        maxTokens: 6000,
        instruction:
          'Provide focused course notes (450-650 words). Still embed resources inline. CRITICAL: Always complete your thoughts - never end mid-sentence.',
      },
      standard: {
        maxTokens: 10000,
        instruction:
          'Provide scannable course notes (600-900 words) with headings, bullets, and callouts. Embed provided resources inline. CRITICAL: Always complete your thoughts - never end mid-sentence.',
      },
      comprehensive: {
        maxTokens: 16000,
        instruction:
          'Provide comprehensive course notes (900-1200 words) with deeper exposition and applications. Embed provided resources inline. CRITICAL: Always complete your thoughts - never end mid-sentence.',
      },
    };

    const config = lengthConfig[referenceLength as keyof typeof lengthConfig] || lengthConfig.standard;

    // NARRATIVE-FIRST COURSE NOTES SYSTEM PROMPT - ENHANCED FOR READABILITY
    const systemPrompt = `You are an ACADEMIC COURSE AUTHOR producing authoritative, highly readable COURSE NOTES comparable to Harvard ManageMentor or MIT OpenCourseWare.

CRITICAL: Write the PRIMARY learning material. This is NOT a resource list. Make it SCANNABLE and ENGAGING.

Generate ALL content in ${targetLanguage}.

LEVEL: ${referenceLength.toUpperCase()}
${config.instruction}

═══════════════════════════════════════════════════════════════
                    SCANNABLE CONTENT DESIGN
═══════════════════════════════════════════════════════════════

Your content MUST be extremely easy to scan and read:

1. SHORT PARAGRAPHS: 2-4 sentences max per paragraph
2. VISUAL HIERARCHY: Use clear section headings and subheadings  
3. KEY TAKEAWAYS: Start sections with the main insight, then elaborate
4. BULLET POINTS: Use lists for multiple related items
5. CALLOUT BOXES: Highlight definitions, key concepts, and quotes
6. WHITE SPACE: Break up dense content with formatting

═══════════════════════════════════════════════════════════════
                    HTML OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

STRUCTURE (use generously):
- <h2> for major sections with descriptive titles (not just "I. Overview")
- <h3> for subsections
- <p> for short paragraphs (2-4 sentences max)

VISUAL EMPHASIS:
- <strong> for key terms and important concepts
- <em> for definitions, foreign terms, emphasis
- <mark> for critical must-remember points (use sparingly, 1-2 per section)

CALLOUT BOXES (use these styled divs):
- <div class="callout-definition"><strong>Definition:</strong> term explanation</div>
- <div class="callout-key-insight"><strong>Key Insight:</strong> important point</div>
- <div class="callout-example"><strong>Example:</strong> illustration</div>
- <div class="callout-warning"><strong>Common Misconception:</strong> clarification</div>

QUOTES:
- <blockquote><p>Quote text</p><cite>— Author Name, Source</cite></blockquote>

LISTS (prefer these for multiple items):
- <ul> for unordered, <ol> for ordered, sequences, or rankings
- <li> with <strong> for the key term followed by explanation

CITATIONS (CRITICAL - use throughout):
- <a href="URL" target="_blank" class="citation">[1]</a> for inline numbered citations
- <sup><a href="URL" target="_blank" class="footnote">1</a></sup> for superscript footnotes
- Always cite sources from the provided academic sources

═══════════════════════════════════════════════════════════════
                    EMBEDDED RESOURCES
═══════════════════════════════════════════════════════════════

Resources MUST be woven naturally into the narrative:

EMBEDDING PATTERN:
1. Context sentence explaining WHY to engage with this resource
2. <div class="embedded-resource" data-type="video|reading|lesson" data-index="N"></div>
3. Follow-up synthesis connecting it to your explanation

VIDEO: data-type="video" data-index="0" (or 1, 2...)
READING: data-type="reading" data-index="0" (or 1, 2...)
LESSON: data-type="lesson" data-index="0" (or 1, 2...)

═══════════════════════════════════════════════════════════════
                     EXAMPLE OUTPUT
═══════════════════════════════════════════════════════════════

<h2>Understanding the Knowledge Argument</h2>

<div class="callout-key-insight">
<strong>Key Insight:</strong> There may be truths about conscious experience that cannot be captured by physical descriptions alone.
</div>

<p>The concept of <strong>qualia</strong> represents one of philosophy's most enduring puzzles. First articulated by <a href="https://philpapers.org/rec/JACWMK" target="_blank" class="citation">Frank Jackson (1982)</a>, it asks: what is it <em>like</em> to have an experience?</p>

<h3>Mary's Room: The Thought Experiment</h3>

<p>Imagine a scientist named Mary who has lived her entire life in a black-and-white room. She knows everything there is to know about the physics of color—wavelengths, neural responses, optic pathways—but has never <em>seen</em> color.</p>

<p>When Mary finally leaves the room and sees red for the first time, does she learn something new?</p>

<blockquote>
<p>"Mary learns something when she leaves the room. She learns what it is like to see colors."</p>
<cite>— Frank Jackson, <a href="https://philpapers.org" target="_blank">Epiphenomenal Qualia</a></cite>
</blockquote>

<p>This thought experiment is beautifully explained in the following video. Pay attention to how Jackson distinguishes between <strong>knowing about</strong> and <strong>knowing what it's like</strong>:</p>

<div class="embedded-resource" data-type="video" data-index="0"></div>

<p>As demonstrated, the distinction between <mark>phenomenal knowledge</mark> and <mark>physical knowledge</mark> lies at the heart of the consciousness debate.</p>

<h3>Key Distinctions</h3>

<ul>
<li><strong>Physical knowledge</strong> — Facts about wavelengths, neurons, brain states</li>
<li><strong>Phenomenal knowledge</strong> — What it is <em>like</em> to have the experience</li>
<li><strong>Explanatory gap</strong> — Why physical facts seem unable to explain subjective experience</li>
</ul>

<div class="callout-definition">
<strong>Definition:</strong> <em>Qualia</em> (singular: quale) are the subjective, qualitative properties of conscious experiences—the "what it's likeness" of sensations.
</div>

<p>For deeper exploration of these distinctions, this foundational reading from Stanford Encyclopedia of Philosophy provides rigorous analysis:</p>

<div class="embedded-resource" data-type="reading" data-index="0"></div>

═══════════════════════════════════════════════════════════════
                      CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. READABILITY FIRST: Short paragraphs, clear headings, generous formatting
2. CITE EVERYTHING: Use inline citations with links to sources
3. USE CALLOUTS: Definition, Key Insight, Example boxes for important content
4. EMBED RESOURCES: With context before AND synthesis after
5. Prefer clarity over length; if in doubt, shorten and add headings/bullets
6. EVERY paragraph wrapped in <p> tags, 2-4 sentences max

FORBIDDEN:
- Long paragraphs (5+ sentences)
- Walls of text without visual breaks
- Uncited claims (cite your sources!)
- Bare links without context
- Resources listed at end instead of interwoven
- Missing callout boxes for definitions/key points`;

    const userPrompt = `Generate formal academic COURSE NOTES with INTERWOVEN RESOURCES for: ${stepTitle}

${fullContext}

Remember: 
1. You are writing the PRIMARY TEXT - substantive explanatory prose
2. Resources are EMBEDDED at pedagogically appropriate moments
3. Each resource has intro context before AND follow-up text after
4. Include inline links to sources throughout
5. Minimum 800 words of prose

Return ONLY valid HTML.`;

    console.log('Calling Lovable AI with enriched context...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: config.maxTokens,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated from AI');
    }

    console.log('Summary generated, length:', summary.length, 'chars');

    // Cache the summary with locale
    const { error: upsertError } = await supabase
      .from('step_summaries')
      .upsert({
        step_title: stepTitle,
        discipline: discipline,
        length: referenceLength,
        summary: summary,
        locale: locale,
      }, {
        onConflict: 'step_title,discipline,length,locale',
      });

    if (upsertError) {
      console.error('Error caching summary:', upsertError);
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-step-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});