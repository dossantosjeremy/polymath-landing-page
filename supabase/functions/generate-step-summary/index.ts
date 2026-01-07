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

    // Adjust prompts and tokens based on reference length - INCREASED for Harvard-style depth
    const lengthConfig = {
      brief: {
        maxTokens: 4000,
        instruction: 'Provide a focused explanation of core concepts with key definitions and examples. While concise, still include substantive academic content. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      },
      standard: {
        maxTokens: 8000,
        instruction: 'Provide substantial course notes including conceptual exposition, expert demonstrations, application examples, and transition to next concepts. Aim for 600-900 words of prose. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      },
      comprehensive: {
        maxTokens: 14000,
        instruction: 'Provide exhaustive Harvard-style course notes with 800-1200+ words of prose. Include deep conceptual exposition, structured frameworks/models, embedded resource references, application/interpretation layer, and transition forward. CRITICAL: Always complete your thoughts and sentences - never end mid-sentence.'
      }
    };

    const config = lengthConfig[referenceLength as keyof typeof lengthConfig] || lengthConfig.standard;

    // HARVARD-STYLE COURSE NOTES SYSTEM PROMPT
    const systemPrompt = `You are an ACADEMIC COURSE AUTHOR producing authoritative COURSE NOTES comparable to Harvard ManageMentor or MIT OpenCourseWare.

You are NOT generating a syllabus summary or resource list. You are writing the PRIMARY learning material.

CRITICAL: Generate ALL content in ${targetLanguage}. This includes headings, paragraphs, terminology explanations, and all text.

LEVEL: ${referenceLength.toUpperCase()}
${config.instruction}

═══════════════════════════════════════════════════════════════
                     OUTPUT CONTRACT (CRITICAL)
═══════════════════════════════════════════════════════════════

🚫 ABSOLUTELY FORBIDDEN OUTPUT PATTERNS:
- Labeling content as "Core material" or "resources"
- Limiting sections to < 500 words of prose
- Presenting resources without surrounding explanation
- Treating videos as replacements for text
- Outputs resembling playlists, resource lists, or minimal summaries

✅ REQUIRED OUTPUT SHAPE (HARVARD-LIKE):

1. CONCEPTUAL EXPOSITION (PRIMARY - 400-700 words)
   - Explanatory prose as the BACKBONE
   - Definitions, distinctions, concrete examples
   - Explicit causal reasoning
   - Written as lecture notes, NOT marketing copy
   - If this section is thin → regenerate

2. STRUCTURED VISUAL/MODEL (SECONDARY)
   - Framework, process, or conceptual model explained inline
   - The learner should understand the model from text alone
   - Use HTML tables or structured lists to visualize relationships

3. APPLICATION / INTERPRETATION LAYER
   - "How this is used in practice"
   - Trade-offs, failure modes, misapplications
   - Often missing in AI outputs → MANDATORY here

4. TRANSITION FORWARD
   - What this enables next
   - How it connects to the following section

═══════════════════════════════════════════════════════════════

CRITICAL CONTENT REQUIREMENTS:
1. Use formal academic tone (NO casual greetings, NO "Alright everyone", NO conversational fillers)
2. Explain IDEAS and ARGUMENTS directly - not just topics
3. Identify key thinkers and their specific contributions
4. Provide historical and intellectual context
5. Use CONCRETE EXAMPLES to illustrate abstract concepts
6. Include clickable links inline as HTML: <a href="URL">Source Name</a>
7. Italicize key terms using <em> tags

ABSOLUTELY EXCLUDE:
1. NO course logistics (reading assignments, page counts, schedules)
2. NO grading or assessment criteria
3. NO study tips or "how to approach" advice
4. NO references to "this course" or "this class"
5. NO casual greetings or conversational language

REQUIRED HTML FORMAT - Academic Outline Structure:

<h1>Topic Title</h1>

<h2>I. Conceptual Exposition</h2>

<h3>A. Key Concept or Framework</h3>
<p class="intro">Contextualizing introduction to the concept.</p>

<p class="point"><strong>1. First Key Idea</strong>: Detailed explanation with examples and reasoning. This is where the substantive content lives. Explain causality, implications, and connections to other ideas.</p>

<p class="detail"><strong>a.</strong> Supporting detail with specific evidence or example...</p>

<h3>B. Second Major Framework</h3>
<p class="point"><strong>1. Core Principle</strong>: In-depth explanation...</p>

<h2>II. Application & Interpretation</h2>

<h3>A. Practical Implementation</h3>
<p>How these concepts manifest in real-world practice...</p>

<h3>B. Common Pitfalls and Trade-offs</h3>
<p class="point"><strong>1. Misapplication Pattern</strong>: What goes wrong when...</p>

<h2>III. Transition Forward</h2>
<p>This understanding of [topic] prepares you to explore [next concept] by establishing the foundational framework for...</p>

ELEMENT GUIDE:
- <h1>: Main title only
- <h2>: Roman numeral sections (I., II., III.) - ONLY if 2+ sections
- <h3>: Letter subsections (A., B., C.) - ONLY if 2+ subsections
- <p class="intro">: Brief introduction to subsection
- <p class="point">: Numbered points (1., 2., 3.) with substantive content
- <p class="detail">: Letter details (a., b., c.) with evidence/examples
- Use <strong> for outline markers and key names
- Use <em> for emphasis on terms, foreign words, concepts
- Use <a href="url"> for inline citations

COGNITIVE METADATA (include at end if pedagogical context provided):
<div class="cognitive-metadata">
  <p><strong>Cognitive Level:</strong> [Analyze/Apply/Create/etc.]</p>
  <p><strong>Learner can now:</strong> [Specific actionable capability]</p>
  <p><strong>Common misconception addressed:</strong> [What this prevents]</p>
</div>`;

    const userPrompt = `Generate formal academic COURSE NOTES in HTML format for: ${stepTitle}

${fullContext}

Remember: You are the PRIMARY TEXT, not a reference to other materials. Write substantive explanatory prose (400-700+ words minimum) that teaches the concepts directly. Use the structured outline format with separate elements for proper visual hierarchy.

Return ONLY valid HTML. Focus on explaining ideas, theories, key thinkers, their arguments, historical context, practical applications, and transitions to next concepts.`;

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
