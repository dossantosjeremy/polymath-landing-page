// Curated reliable images for each domain category
const domainFallbackImages: Record<string, string> = {
  "Business": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=400&fit=crop",
  "Arts and Humanities": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
  "Engineering": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600&h=400&fit=crop",
  "Life Sciences": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&h=400&fit=crop",
  "Medicine and Health Sciences": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
  "Natural Sciences": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&h=400&fit=crop",
  "Social Sciences": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
  "Education": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
  "Law": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop",
  "default": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=400&fit=crop"
};

// Generate a hash from string for unique signatures
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Simplify search term for better Unsplash results
export const simplifySearchTerm = (term: string): string => {
  const stopWords = ['and', 'the', 'of', 'in', 'for', 'to', 'with', 'on', 'at', 'sciences', 'studies', 'applied'];
  const words = term.toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  return words.slice(0, 2).join(' ') || term.split(' ')[0];
};

// Generate primary image URL using Picsum with unique seed
export const getPrimaryImageUrl = (name: string, context?: string): string => {
  const seed = `${name}-${context || 'default'}`.replace(/\s+/g, '-').toLowerCase();
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
};

// Generate fallback image URL with different seed variation
export const getFallbackImageUrl = (name: string): string => {
  const seed = `${name}-fallback`.replace(/\s+/g, '-').toLowerCase();
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
};

// Get curated domain fallback
export const getDomainFallbackImage = (domain: string): string => {
  return domainFallbackImages[domain] || domainFallbackImages.default;
};

// Generate gradient from name (last resort)
export const getGradientFromName = (name: string): string => {
  const hash = hashString(name);
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 35%), hsl(${(hue + 45) % 360}, 60%, 25%))`;
};
