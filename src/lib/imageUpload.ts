import { supabase } from "@/integrations/supabase/client";

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an image file before upload
 */
export const validateImageFile = (file: File): ImageValidationResult => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
};

/**
 * Generates a unique, safe filename for storage
 */
export const generateSafeFilename = (originalName: string, bikeTypeId: string): string => {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `${bikeTypeId}/${timestamp}-${randomString}.${extension}`;
};

/**
 * Uploads a bike image to Supabase storage
 */
export const uploadBikeImage = async (
  file: File,
  bikeTypeId: string
): Promise<ImageUploadResult> => {
  // Validate file first
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const filename = generateSafeFilename(file.name, bikeTypeId);

  try {
    const { data, error } = await supabase.storage
      .from('bike-images')
      .upload(filename, file, {
        // 1 year — filenames are unique (timestamp + random), so cached files
        // never go stale. Browsers + CDN can keep them indefinitely.
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bike-images')
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Upload exception:', error);
    return { success: false, error: 'Failed to upload image' };
  }
};

/**
 * Deletes a bike image from Supabase storage
 */
export const deleteBikeImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract the path from the full URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/storage/v1/object/public/bike-images/');
    if (pathParts.length < 2) {
      console.error('Invalid image URL format');
      return false;
    }

    const filePath = decodeURIComponent(pathParts[1]);

    const { error } = await supabase.storage
      .from('bike-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
};

/**
 * Gets full public URL for an image path
 */
export const getImagePublicUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('bike-images')
    .getPublicUrl(path);
  return data.publicUrl;
};
