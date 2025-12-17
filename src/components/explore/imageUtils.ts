// Curated reliable images for each domain category (L1)
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
  "Agricultural Sciences": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop",
  "Architecture": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&h=400&fit=crop",
  "Computer Science": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop",
  "default": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=400&fit=crop"
};

// Curated images for L2 subdomains (organized by parent domain)
const subdomainImages: Record<string, string> = {
  // Life Sciences
  "Bioinformatics": "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=600&h=400&fit=crop",
  "Biology": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=400&fit=crop",
  "Biotechnology": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop",
  "Cell and Developmental Biology": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&h=400&fit=crop",
  "Ecology and Evolutionary Biology": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop",
  "Genetics": "https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=600&h=400&fit=crop",
  "Microbiology": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&h=400&fit=crop",
  "Neuroscience": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
  "Physiology": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=600&h=400&fit=crop",
  "Zoology": "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=600&h=400&fit=crop",
  "Botany": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
  "Biochemistry": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=400&fit=crop",
  
  // Medicine and Health Sciences
  "Medicine": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
  "Nursing": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop",
  "Public Health": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop",
  "Pharmacy": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=400&fit=crop",
  "Dentistry": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop",
  
  // Natural Sciences
  "Physics": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop",
  "Chemistry": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&h=400&fit=crop",
  "Mathematics": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=400&fit=crop",
  "Astronomy": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=400&fit=crop",
  "Earth Sciences": "https://images.unsplash.com/photo-1451186859696-371d9477be93?w=600&h=400&fit=crop",
  "Geology": "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop",
  
  // Engineering
  "Mechanical Engineering": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop",
  "Electrical Engineering": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&h=400&fit=crop",
  "Civil Engineering": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop",
  "Chemical Engineering": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&h=400&fit=crop",
  "Computer Engineering": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
  
  // Business
  "Finance": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
  "Marketing": "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&h=400&fit=crop",
  "Management": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
  "Accounting": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
  "Economics": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
  
  // Arts and Humanities
  "Philosophy": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=400&fit=crop",
  "History": "https://images.unsplash.com/photo-1461360370896-922624d12a74?w=600&h=400&fit=crop",
  "Literature": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&h=400&fit=crop",
  "Languages": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=400&fit=crop",
  "Music": "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&h=400&fit=crop",
  "Art": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
  "Theater": "https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=400&fit=crop",
  
  // Social Sciences
  "Psychology": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
  "Sociology": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
  "Political Science": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=400&fit=crop",
  "Anthropology": "https://images.unsplash.com/photo-1461360370896-922624d12a74?w=600&h=400&fit=crop",
  "Geography": "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=600&h=400&fit=crop",
  
  // Computer Science
  "Artificial Intelligence": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
  "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
  "Software Engineering": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop",
  "Cybersecurity": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
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

// Generate primary image URL - prefer curated, fallback to domain image
export const getPrimaryImageUrl = (name: string, context?: string): string => {
  // Check for curated subdomain image first
  if (subdomainImages[name]) {
    return subdomainImages[name];
  }
  // Fallback to parent domain's curated image if context provided
  if (context && domainFallbackImages[context]) {
    return domainFallbackImages[context];
  }
  // Final fallback to default
  return domainFallbackImages.default;
};

// Generate fallback image URL - returns parent domain image
export const getFallbackImageUrl = (name: string): string => {
  // Check curated subdomain
  if (subdomainImages[name]) {
    return subdomainImages[name];
  }
  return domainFallbackImages.default;
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
