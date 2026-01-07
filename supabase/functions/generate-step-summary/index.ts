import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      // NEW: Pedagogical metadata from Course Grammar
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
      hasPedagogicalMeta: !!(learningObjective || pedagogicalFunction)
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Language configuration
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

    // Generate comprehensive reference using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build comprehensive context including pedagogical metadata
    let contextParts = [
      `Step Title: ${stepTitle}`,
      `Discipline: ${discipline}`,
      `Step Description: ${stepDescription || 'Not provided'}`,
    ];

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

    if (resources) {
      if (resources.primaryVideo) {
        contextParts.push(`\nPrimary Video: "${resources.primaryVideo.title}" by ${resources.primaryVideo.author}`);
        contextParts.push(`Video URL: ${resources.primaryVideo.url}`);
        if (resources.primaryVideo.whyThisVideo) {
          contextParts.push(`Why this video: ${resources.primaryVideo.whyThisVideo}`);
        }
      }

      if (resources.deepReading) {
        contextParts.push(`\nDeep Reading: "${resources.deepReading.title}"`);
        contextParts.push(`Reading URL: ${resources.deepReading.url}`);
        contextParts.push(`Focus: ${resources.deepReading.focusHighlight}`);
        contextParts.push(`Snippet: ${resources.deepReading.snippet}`);
      }

      if (resources.book) {
        contextParts.push(`\nRecommended Book: "${resources.book.title}" by ${resources.book.author}`);
        if (resources.book.chapterRecommendation) {
          contextParts.push(`Chapter Recommendation: ${resources.book.chapterRecommendation}`);
        }
        contextParts.push(`Why this book: ${resources.book.why}`);
      }

      if (resources.alternatives && resources.alternatives.length > 0) {
        contextParts.push(`\nAlternative Resources: ${resources.alternatives.length} additional resources available`);
      }
    }

    const fullContext = contextParts.join('\n');

    // Adjust prompts and tokens based on reference length
    const lengthConfig = {
      brief: {
        maxTokens: 3000,
        instruction: 'Provide a concise explanation of the core ideas, key arguments, and essential concepts only. Focus on clarity and brevity. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      },
      standard: {
        maxTokens: 6000,
        instruction: 'Provide a thorough explanation of the subject matter, including key concepts, important thinkers, main arguments, and relevant historical context. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      },
      comprehensive: {
        maxTokens: 12000,
        instruction: 'Provide an exhaustive exploration of the subject matter, including detailed explanations of concepts, extensive historical and intellectual context, related debates, counterarguments, and concrete examples. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      }
    };

    const config = lengthConfig[referenceLength as keyof typeof lengthConfig] || lengthConfig.standard;

    const systemPrompt = `You are a subject-matter expert delivering academic lecture notes. Provide scholarly, formal educational content focused exclusively on the actual subject matter—the ideas, theories, arguments, historical context, and key thinkers.

CRITICAL: Generate ALL content in ${targetLanguage}. This includes headings, paragraphs, terminology explanations, and all text.

LEVEL: ${referenceLength.toUpperCase()}
${config.instruction}

CRITICAL REQUIREMENTS - CONTENT:
1. Use formal academic tone (NO casual greetings, NO "Alright everyone", NO conversational fillers)
2. Explain philosophical/scientific/historical IDEAS and ARGUMENTS directly
3. Identify key thinkers and their specific contributions, theories, or positions
4. Provide historical and intellectual context that illuminates the ideas
5. Use concrete examples to illustrate abstract concepts
6. Include clickable links inline as HTML: <a href="URL">Source Name</a>
7. Italicize key terms and concepts using <em> tags

CRITICAL REQUIREMENTS - EXCLUDE:
1. NO course logistics (reading assignments, page counts, schedules, participation)
2. NO grading or assessment criteria
3. NO study tips or "how to approach" advice
4. NO references to "this course" or "this class"
5. NO casual greetings or conversational language ("Alright everyone", "Today we're diving into")

REQUIRED OUTPUT FORMAT - HTML with Academic Outline Structure:
Return ONLY valid HTML (no markdown). Each outline level must be a separate element for proper visual hierarchy.

Example structure:

<h1>Main Topic Title</h1>

<h2>I. First Major Section</h2>

<h3>A. The Milesian School</h3>
<p class="intro">Early inquiries into the fundamental nature of reality.</p>

<p class="point"><strong>1. Thales of Miletus</strong> (c. 624–546 BCE): Often considered the first philosopher, Thales proposed that <em>water</em> was the fundamental substance...</p>

<p class="detail"><strong>a.</strong> His reasoning stemmed from observations of water's omnipresence in nature...</p>

<p class="sub-detail"><strong>i.</strong> Water exists in multiple states and appears essential for life...</p>

<p class="point"><strong>2. Anaximander of Miletus</strong> (c. 610–546 BCE): A student of Thales, Anaximander posited the <em>apeiron</em>...</p>

<h3>B. Other Major Pre-Socratic Thinkers</h3>
<p class="point"><strong>1. Heraclitus of Ephesus</strong> (c. 535–475 BCE): Known for the doctrine of perpetual change...</p>

<h2>II. Second Major Section</h2>

ELEMENT GUIDE:
- <h1>: Main title only
- <h2>: Roman numeral sections (I., II., III., IV.) - ONLY if there are 2+ sections at this level
- <h3>: Letter subsections (A., B., C., D.) - ONLY if there are 2+ subsections at this level
- <p class="intro">: Optional brief introduction to subsection
- <p class="point">: Numbered points (1., 2., 3.) - ONLY if there are 2+ points at this level
- <p class="detail">: Letter details (a., b., c.) - ONLY if there are 2+ details at this level
- <p class="sub-detail">: Roman numeral sub-details (i., ii., iii.) - ONLY if there are 2+ sub-details at this level
- Use <strong> to bold outline markers and key names
- Use <em> for emphasis on key terms, foreign words, technical concepts
- Use <a href="url"> for inline citations

CRITICAL OUTLINE NUMBERING RULE: Only use outline markers (I., A., 1., a., i.) when there are at least 2 items at that level. If there is only one item, present it as regular paragraphs without the outline marker. For example:
- If you have only one Roman section, don't use "I." - just use <h2> with the title
- If you have only one numbered point under a subsection, don't use "1." - just use <p> without the marker
- This applies to ALL outline levels

Each outline item must be in its own element for proper visual hierarchy. Do NOT combine multiple outline items in one paragraph.`;

    const userPrompt = `Generate formal academic reference notes in HTML format for: ${stepTitle}

${fullContext}

Return ONLY valid HTML. Use the structured outline format with separate elements:
- <h1> for main title
- <h2> for Roman sections (I., II.)
- <h3> for letter subsections (A., B.)
- <p class="point"> for each numbered point (1., 2., 3.)
- <p class="detail"> for each letter detail (a., b., c.)
- <p class="sub-detail"> for each sub-detail (i., ii., iii.)

Each outline item must be in its own element for proper visual hierarchy. Use <em> for key terms, <strong> for outline markers and names, and <a> for citations. Focus exclusively on explaining the ideas, theories, key thinkers, their arguments, and historical/intellectual context.`;

    console.log('Calling Lovable AI...');
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

    console.log('Summary generated, caching...');

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
      // Don't fail the request if caching fails
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
