import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CuratedStepResources } from '@/hooks/useCuratedResources';

interface ResourceCache {
  [stepTitle: string]: CuratedStepResources;
}

interface ResourceCacheContextType {
  cache: ResourceCache;
  getResource: (stepTitle: string) => CuratedStepResources | undefined;
  setResource: (stepTitle: string, resources: CuratedStepResources) => void;
  hasResource: (stepTitle: string) => boolean;
  getAllCachedResources: () => ResourceCache;
  clearCache: () => void;
}

const ResourceCacheContext = createContext<ResourceCacheContextType | undefined>(undefined);

interface ResourceCacheProviderProps {
  children: ReactNode;
}

export function ResourceCacheProvider({ children }: ResourceCacheProviderProps) {
  const [cache, setCache] = useState<ResourceCache>({});

  const getResource = useCallback((stepTitle: string): CuratedStepResources | undefined => {
    return cache[stepTitle];
  }, [cache]);

  const setResource = useCallback((stepTitle: string, resources: CuratedStepResources) => {
    setCache(prev => ({
      ...prev,
      [stepTitle]: resources
    }));
  }, []);

  const hasResource = useCallback((stepTitle: string): boolean => {
    return stepTitle in cache;
  }, [cache]);

  const getAllCachedResources = useCallback((): ResourceCache => {
    return cache;
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  return (
    <ResourceCacheContext.Provider 
      value={{ 
        cache, 
        getResource, 
        setResource, 
        hasResource, 
        getAllCachedResources,
        clearCache 
      }}
    >
      {children}
    </ResourceCacheContext.Provider>
  );
}

export function useResourceCache(): ResourceCacheContextType {
  const context = useContext(ResourceCacheContext);
  if (!context) {
    throw new Error('useResourceCache must be used within a ResourceCacheProvider');
  }
  return context;
}
