// The Magistrate - Domain Authority Discovery
// Identifies "Standard Bearers" for any topic before searching for content

export interface DomainAuthority {
  name: string;                    // "Nielsen Norman Group"
  domain: string;                  // "nngroup.com"
  authorityType: 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';
  authorityReason: string;         // "Founded by Don Norman, the father of UX"
  focusAreas: string[];            // ["Usability", "Research Methods", "Heuristics"]
}

export interface AuthorityDiscoveryResult {
  authorities: DomainAuthority[];
  searchStrategy: string;          // How to search these authorities
}

export async function identifyDomainAuthorities(
  topic: string,
  lovableApiKey: string
): Promise<AuthorityDiscoveryResult> {
  console.log(`[Magistrate] Identifying domain authorities for: ${topic}`);
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a Domain Researcher specializing in identifying authoritative sources for learning.

Your task is to identify the "Standard Bearers" - the undisputed authorities, standard bodies, and elite practitioners - for any given topic.

CRITICAL RULES:
1. Do NOT pick popular blogs or generic sources
2. Pick organizations that DEFINE standards in the field
3. Prefer industry leaders over academic institutions for vocational/practical topics
4. Include both foundational authorities AND modern practitioners
5. Each authority must have a specific, verifiable domain

Return your analysis as valid JSON only.`
          },
          {
            role: 'user',
            content: `Identify the "Standard Bearers" (authoritative sources) for: "${topic}"

Ask yourself: "Who are the undisputed authorities, standard bodies, or elite practitioners in this specific field?"

EXAMPLES of good authority identification:
- "UX Design" → NNGroup (nngroup.com), IDEO (ideo.com), Laws of UX (lawsofux.com), Interaction Design Foundation (interaction-design.org)
- "Product Management" → Silicon Valley Product Group (svpg.com), Reforge (reforge.com), Mind the Product (mindtheproduct.com)
- "Cooking" → Serious Eats (seriouseats.com), America's Test Kitchen (americastestkitchen.com), CIA (ciachef.edu)
- "Storytelling" → Pixar (pixar.com), Robert McKee (mckeestory.com), The Moth (themoth.org)
- "Data Science" → Kaggle (kaggle.com), Towards Data Science (towardsdatascience.com), Google AI (ai.google)
- "Finance" → CFA Institute (cfainstitute.org), Damodaran (pages.stern.nyu.edu/~adamodar), Investopedia (investopedia.com)
- "Marketing" → HubSpot (hubspot.com), Seth Godin (seths.blog), Marketing Week (marketingweek.com)

Return JSON with 3-6 authorities:

{
  "authorities": [
    {
      "name": "Full Organization Name",
      "domain": "example.com",
      "authorityType": "industry_standard" | "academic" | "practitioner" | "standard_body",
      "authorityReason": "Why this is THE authority (founder credentials, industry adoption, standard-setting role)",
      "focusAreas": ["Specific Area 1", "Specific Area 2"]
    }
  ],
  "searchStrategy": "Brief description of how to search these sources for ${topic} content"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`[Magistrate] API error: ${response.status}`);
      return getDefaultAuthorities(topic);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Magistrate] No content in response');
      return getDefaultAuthorities(topic);
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Magistrate] No JSON found in response');
      return getDefaultAuthorities(topic);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed.authorities && Array.isArray(parsed.authorities) && parsed.authorities.length > 0) {
      console.log(`[Magistrate] ✓ Identified ${parsed.authorities.length} authorities`);
      parsed.authorities.forEach((auth: DomainAuthority) => {
        console.log(`  - ${auth.name} (${auth.domain}) [${auth.authorityType}]`);
      });
      
      return {
        authorities: parsed.authorities,
        searchStrategy: parsed.searchStrategy || `Search ${parsed.authorities.map((a: DomainAuthority) => a.domain).join(', ')} for ${topic} content`
      };
    }

    return getDefaultAuthorities(topic);
  } catch (error) {
    console.error('[Magistrate] Exception:', error);
    return getDefaultAuthorities(topic);
  }
}

function getDefaultAuthorities(topic: string): AuthorityDiscoveryResult {
  // Provide sensible defaults based on common topic patterns
  const topicLower = topic.toLowerCase();
  
  // UX/Design topics
  if (topicLower.includes('ux') || topicLower.includes('user experience') || topicLower.includes('usability')) {
    return {
      authorities: [
        { name: 'Nielsen Norman Group', domain: 'nngroup.com', authorityType: 'industry_standard', authorityReason: 'Founded by Don Norman and Jakob Nielsen, pioneers of UX research', focusAreas: ['Usability', 'UX Research', 'Heuristics'] },
        { name: 'IDEO', domain: 'ideo.com', authorityType: 'practitioner', authorityReason: 'World-renowned design firm that pioneered human-centered design', focusAreas: ['Design Thinking', 'Human-Centered Design'] },
        { name: 'Interaction Design Foundation', domain: 'interaction-design.org', authorityType: 'academic', authorityReason: 'Largest online design school with industry-recognized courses', focusAreas: ['Interaction Design', 'UI Design'] }
      ],
      searchStrategy: 'Search nngroup.com, ideo.com, and interaction-design.org for UX curriculum and best practices'
    };
  }
  
  // Product Management topics
  if (topicLower.includes('product management') || topicLower.includes('product manager')) {
    return {
      authorities: [
        { name: 'Silicon Valley Product Group', domain: 'svpg.com', authorityType: 'industry_standard', authorityReason: 'Founded by Marty Cagan, former VP of Product at eBay', focusAreas: ['Product Strategy', 'Product Discovery'] },
        { name: 'Reforge', domain: 'reforge.com', authorityType: 'practitioner', authorityReason: 'Advanced growth and product programs from top tech leaders', focusAreas: ['Growth', 'Product-Led Growth'] },
        { name: 'Mind the Product', domain: 'mindtheproduct.com', authorityType: 'standard_body', authorityReason: 'Largest global product management community', focusAreas: ['Product Community', 'Best Practices'] }
      ],
      searchStrategy: 'Search svpg.com, reforge.com, and mindtheproduct.com for product management frameworks'
    };
  }
  
  // Data Science / ML topics
  if (topicLower.includes('data science') || topicLower.includes('machine learning') || topicLower.includes('ai')) {
    return {
      authorities: [
        { name: 'Google AI', domain: 'ai.google', authorityType: 'industry_standard', authorityReason: 'Leading AI research organization with open publications', focusAreas: ['Machine Learning', 'AI Research'] },
        { name: 'Kaggle', domain: 'kaggle.com', authorityType: 'practitioner', authorityReason: 'World\'s largest data science community with competitions and courses', focusAreas: ['Practical ML', 'Data Analysis'] },
        { name: 'Fast.ai', domain: 'fast.ai', authorityType: 'academic', authorityReason: 'Free courses making deep learning accessible, founded by Jeremy Howard', focusAreas: ['Deep Learning', 'Practical AI'] }
      ],
      searchStrategy: 'Search ai.google, kaggle.com, and fast.ai for data science curriculum'
    };
  }
  
  // Default fallback for unknown topics
  return {
    authorities: [
      { name: 'Coursera', domain: 'coursera.org', authorityType: 'academic', authorityReason: 'Top university courses from Stanford, Yale, and others', focusAreas: ['Academic Courses'] },
      { name: 'MIT OpenCourseWare', domain: 'ocw.mit.edu', authorityType: 'academic', authorityReason: 'Free course materials from MIT', focusAreas: ['University Curriculum'] }
    ],
    searchStrategy: `Search coursera.org and ocw.mit.edu for ${topic} courses`
  };
}
