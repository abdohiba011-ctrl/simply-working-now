// Bike image resolver utility
// Maps database image URLs to actual asset paths
// Using optimized thumbnail images for better performance (200x150 WebP)

import sanyaImg from "@/assets/hero-bikes/sanya-thumb.webp";
import becaneImg from "@/assets/hero-bikes/becane-thumb.webp";
import cappuccinoImg from "@/assets/hero-bikes/cappuccino-thumb.webp";
import orbitImg from "@/assets/hero-bikes/orbit-thumb.webp";
import shImg from "@/assets/hero-bikes/sh-thumb.webp";

// Mapping of bike name patterns to optimized thumb images
const bikeNamePatterns: Array<{ pattern: RegExp; image: string }> = [
  { pattern: /sanya/i, image: sanyaImg },
  { pattern: /becane/i, image: becaneImg },
  { pattern: /cappuccino/i, image: cappuccinoImg },
  { pattern: /orbit/i, image: orbitImg },
  { pattern: /\bsh\b/i, image: shImg },
];

// Direct filename mapping for legacy support
const imageMap: Record<string, string> = {
  'sanya.webp': sanyaImg,
  'sanya-opt.avif': sanyaImg,
  'sanya-thumb.webp': sanyaImg,
  'sanya.jpg': sanyaImg,
  'becane.webp': becaneImg,
  'becane-opt.avif': becaneImg,
  'becane-thumb.webp': becaneImg,
  'becane.png': becaneImg,
  'cappuccino.webp': cappuccinoImg,
  'cappuccino-opt.avif': cappuccinoImg,
  'cappuccino-thumb.webp': cappuccinoImg,
  'cappuccino.jpg': cappuccinoImg,
  'orbit.webp': orbitImg,
  'orbit-opt.avif': orbitImg,
  'orbit-thumb.webp': orbitImg,
  'orbit.jpg': orbitImg,
  'sh.webp': shImg,
  'sh-opt.avif': shImg,
  'sh-thumb.webp': shImg,
  'sh.png': shImg,
};

/**
 * Resolves a bike image URL from the database to a usable image path
 * ALWAYS returns optimized thumb versions (200x150 WebP) for known bikes
 * This prevents loading 1MB+ images when thumbnails are sufficient
 */
export const resolveBikeImageUrl = (url: string | null | undefined, bikeName?: string): string => {
  if (!url) return '/placeholder.svg';
  
  // Extract filename from URL
  const filename = url.split('/').pop()?.toLowerCase() || '';
  
  // Check direct filename mapping first
  if (imageMap[filename]) {
    return imageMap[filename];
  }
  
  // Check if URL contains any known bike pattern and return optimized thumb
  for (const { pattern, image } of bikeNamePatterns) {
    if (pattern.test(url) || pattern.test(filename)) {
      return image;
    }
  }
  
  // If bikeName was provided, try matching by name
  if (bikeName) {
    for (const { pattern, image } of bikeNamePatterns) {
      if (pattern.test(bikeName)) {
        return image;
      }
    }
  }
  
  // If it's a Supabase storage URL or external URL, use it directly
  // (for user-uploaded custom bike images)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative path starting with /, try to use it
  if (url.startsWith('/')) {
    return url;
  }
  
  // Fallback to placeholder
  return '/placeholder.svg';
};

/**
 * Check if an image URL is a Supabase storage URL
 */
export const isSupabaseStorageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('.supabase.co/storage/');
};

/**
 * Extract the file path from a Supabase storage URL
 */
export const getStoragePathFromUrl = (url: string): string | null => {
  if (!isSupabaseStorageUrl(url)) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
};
