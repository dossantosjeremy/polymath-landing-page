// Generate a hash from string for unique gradient generation
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Generate a visually appealing gradient from discipline name
export const getGradientFromName = (name: string): string => {
  const hash = hashString(name);
  const hue = hash % 360;
  // Use darker tones that work well with white text overlay
  return `linear-gradient(135deg, hsl(${hue}, 70%, 25%), hsl(${(hue + 45) % 360}, 60%, 15%))`;
};

// Legacy exports for compatibility (no longer used but keep for safety)
export const getCuratedImageUrl = (_name: string): string | null => null;
export const getDomainFallbackImage = (_domain: string): string => '';
export const simplifySearchTerm = (term: string): string => term.split(' ')[0];
