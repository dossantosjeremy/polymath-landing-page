import { callPerplexityWithThrottle, extractJSON } from "../_shared/perplexity-client.ts";

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
  type: string;
}

/**
 * Generate a lightweight syllabus structure with only titles and tags.
 * Detailed descriptions and resources are fetched later on-demand.
 */
export async function generateLightweightStructure(
  discipline: string,
  sources: DiscoveredSource[],
  apiKey: string
): Promise<Module[]> {
  try {
    const sourcesText = sources.length > 0
      ? sources.slice(0, 5).map(s => `- ${s.institution}: ${s.courseName} (${s.url})`).join('\n')
      : 'No specific sources provided';

    const data = await callPerplexityWithThrottle({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum designer. Create a comprehensive learning path with module titles and tags. Return valid JSON only.'
        },
        {
          role: 'user',
          content: `Create a comprehensive learning path for "${discipline}".

Reference these authoritative sources:
${sourcesText}

Generate a syllabus with 8-12 modules covering the topic comprehensively. Include:
- 1-2 capstone/project modules (mark with isCapstone: true)
- Regular content modules covering foundational through advanced topics

Return ONLY valid JSON in this format:
{
  "modules": [
    {
      "title": "Introduction to Core Concepts",
      "tag": "Foundational",
      "sourceUrls": ["https://source1.edu/...", "https://source2.edu/..."],
      "isCapstone": false
    },
    {
      "title": "Final Capstone Project",
      "tag": "Capstone Integration",
      "sourceUrls": ["https://source1.edu/..."],
      "isCapstone": true
    }
  ]
}

Tags should be: "Foundational", "Core Theory", "Applied", "Advanced", "Capstone Integration"

Attribution: Each module's sourceUrls should list URLs from the provided sources that cover that topic. Multiple URLs are encouraged when topics overlap across sources.

Return ONLY the JSON, no other text.`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }, apiKey);

    const content = data.choices[0].message.content;
    const parsed = extractJSON(content);

    if (parsed?.modules && Array.isArray(parsed.modules)) {
      // Ensure all modules have required fields
      const modules = parsed.modules.map((m: any) => ({
        title: m.title || 'Untitled Module',
        tag: m.tag || 'General',
        source: sources[0]?.institution || 'Generated',
        sourceUrl: m.sourceUrls?.[0] || sources[0]?.url || '',
        sourceUrls: m.sourceUrls || [sources[0]?.url].filter(Boolean),
        isCapstone: m.isCapstone || false,
      }));

      // Ensure at least one capstone exists
      const hasCapstone = modules.some((m: Module) => m.isCapstone);
      if (!hasCapstone && modules.length > 0) {
        modules[modules.length - 1].isCapstone = true;
        modules[modules.length - 1].tag = 'Capstone Integration';
        modules[modules.length - 1].title = modules[modules.length - 1].title.includes('Capstone')
          ? modules[modules.length - 1].title
          : `Final Project: ${modules[modules.length - 1].title}`;
      }

      return modules;
    }

    return [];
  } catch (error) {
    console.error('[Structure] Exception:', error);
    return [];
  }
}
