import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseDisciplineImageOptions {
  disciplineName: string;
  context?: string;
  curated?: string | null;
}

interface UseDisciplineImageResult {
  imageUrl: string | null;
  isLoading: boolean;
  isGenerating: boolean;
}

// In-memory cache for generated image URLs
const imageCache = new Map<string, string>();

// Track pending generations to avoid duplicate calls
const pendingGenerations = new Map<string, Promise<string | null>>();

export const useDisciplineImage = ({
  disciplineName,
  context,
  curated
}: UseDisciplineImageOptions): UseDisciplineImageResult => {
  const [imageUrl, setImageUrl] = useState<string | null>(curated || null);
  const [isLoading, setIsLoading] = useState(!curated);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // If we have a curated image, use it
    if (curated) {
      setImageUrl(curated);
      setIsLoading(false);
      return;
    }

    // Check in-memory cache first
    const cacheKey = `${disciplineName}-${context || ''}`;
    const cachedUrl = imageCache.get(cacheKey);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      setIsLoading(false);
      return;
    }

    const fetchOrGenerateImage = async () => {
      setIsLoading(true);

      try {
        // First check database cache
        const { data: existingImage } = await supabase
          .from("discipline_images")
          .select("image_url")
          .eq("discipline_name", disciplineName)
          .single();

        if (existingImage?.image_url) {
          imageCache.set(cacheKey, existingImage.image_url);
          setImageUrl(existingImage.image_url);
          setIsLoading(false);
          return;
        }

        // Check if there's already a pending generation for this discipline
        const existingPromise = pendingGenerations.get(cacheKey);
        if (existingPromise) {
          const url = await existingPromise;
          if (url) {
            setImageUrl(url);
          }
          setIsLoading(false);
          return;
        }

        // Generate new image
        setIsGenerating(true);
        
        const generationPromise = (async () => {
          const { data, error } = await supabase.functions.invoke(
            "generate-discipline-image",
            {
              body: { disciplineName, context },
            }
          );

          if (error) {
            console.error("Error generating discipline image:", error);
            return null;
          }

          return data?.imageUrl || null;
        })();

        pendingGenerations.set(cacheKey, generationPromise);

        const generatedUrl = await generationPromise;
        
        pendingGenerations.delete(cacheKey);

        if (generatedUrl) {
          imageCache.set(cacheKey, generatedUrl);
          setImageUrl(generatedUrl);
        }
      } catch (error) {
        console.error("Error in useDisciplineImage:", error);
      } finally {
        setIsLoading(false);
        setIsGenerating(false);
      }
    };

    fetchOrGenerateImage();
  }, [disciplineName, context, curated]);

  return { imageUrl, isLoading, isGenerating };
};
