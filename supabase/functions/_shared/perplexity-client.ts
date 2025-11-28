/**
 * Shared Perplexity API client with rate limiting and retry logic
 */

const RATE_LIMIT_DELAY_MS = 1000; // 1 second between calls
const MAX_RETRIES = 3;

interface PerplexityMessage {
  role: 'system' | 'user';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
  return_citations?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callPerplexityWithThrottle(
  request: PerplexityRequest,
  apiKey: string
): Promise<any> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add exponential backoff delay
      if (attempt > 0) {
        const backoffDelay = RATE_LIMIT_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[Perplexity] Retry attempt ${attempt + 1}, waiting ${backoffDelay}ms...`);
        await delay(backoffDelay);
      } else {
        // Always add base delay between calls to prevent rate limiting
        await delay(RATE_LIMIT_DELAY_MS);
      }

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Check if rate limited
      if (response.status === 429) {
        console.log(`[Perplexity] Rate limited (429), will retry...`);
        if (attempt < MAX_RETRIES - 1) {
          continue; // Retry with exponential backoff
        }
        throw new Error('Rate limit exceeded after multiple retries');
      }

      // Check response status before parsing JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.error(`[Perplexity] API Error: ${response.status} ${response.statusText}`);
        console.error(`[Perplexity] Content-Type: ${contentType}`);
        
        // Try to get error body
        const errorText = await response.text();
        console.error(`[Perplexity] Error body (first 500 chars): ${errorText.substring(0, 500)}`);
        
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      // Verify we're getting JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(`[Perplexity] Expected JSON but got: ${contentType}`);
        console.error(`[Perplexity] Response body (first 500 chars): ${responseText.substring(0, 500)}`);
        throw new Error('Perplexity API returned non-JSON response');
      }

      // Parse JSON response
      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        console.error('[Perplexity] Invalid response structure:', JSON.stringify(data).substring(0, 200));
        throw new Error('Invalid response structure from Perplexity API');
      }

      console.log(`[Perplexity] ✓ Successful API call (attempt ${attempt + 1})`);
      return data;

    } catch (error) {
      console.error(`[Perplexity] Attempt ${attempt + 1} failed:`, error);
      
      // If it's the last attempt, throw the error
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
      
      // Otherwise, continue to next retry
      continue;
    }
  }

  throw new Error('Max retries exceeded');
}

export function extractJSON(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Look for JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Look for JSON object directly
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    
    throw new Error('No valid JSON found in response');
  }
}
