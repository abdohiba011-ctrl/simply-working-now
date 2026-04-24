// Bike images are now served from Supabase Storage via database URLs.
// This module is kept for backward compatibility with existing imports.

const FALLBACK_IMAGE = "/placeholder.svg";

export const bikeImageMap: Record<string, string> = {};

// Helper function to get image URL from database key.
// If the value is already a full URL (http/https) or a path, return it as-is.
// Otherwise fall back to the placeholder.
export const getBikeImageUrl = (imageKey?: string | null): string => {
  if (!imageKey) return FALLBACK_IMAGE;
  if (/^(https?:)?\/\//.test(imageKey) || imageKey.startsWith("/")) {
    return imageKey;
  }
  return bikeImageMap[imageKey] || FALLBACK_IMAGE;
};
