/**
 * Image compression utility with progress callbacks
 * Compresses images to approximately the target size while maintaining quality
 */

export interface CompressionOptions {
  maxSizeKB?: number;
  maxDimension?: number;
  onProgress?: (progress: number, stage: string) => void;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  mimeType: string;
}

export const compressImage = async (
  file: File, 
  maxSizeKB: number = 500,
  maxDimension: number = 1920,
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    
    // Stage 1: Loading image (0-15%)
    onProgress?.(5, 'Loading image...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        onProgress?.(15, 'Analyzing image...');
        
        // Stage 2: Calculate dimensions (15-25%)
        let { width, height } = { width: img.naturalWidth, height: img.naturalHeight };
        
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        onProgress?.(25, 'Resizing image...');

        // Stage 3: Draw image to canvas (25-35%)
        ctx.drawImage(img, 0, 0, width, height);
        
        onProgress?.(35, 'Preparing compression...');

        // Check WebP support
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const outputFormat = supportsWebP ? 'image/webp' : 'image/jpeg';
        
        // Stage 4: Compression loop (35-85%)
        // Start with higher quality for large files
        const isLargeFile = originalSize > 5 * 1024 * 1024; // > 5MB
        let quality = isLargeFile ? 0.7 : 0.85;
        const minQuality = 0.25;
        let attempts = 0;
        const maxAttempts = 8;
        
        const compress = () => {
          attempts++;
          const compressionProgress = 35 + Math.min(50, attempts * 6);
          onProgress?.(compressionProgress, `Compressing... (attempt ${attempts})`);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Calculate compression ratio
              const compressionRatio = ((originalSize - blob.size) / originalSize * 100).toFixed(0);
              
              // If size is acceptable or quality is at minimum or max attempts reached
              if (blob.size <= maxSizeKB * 1024 || quality <= minQuality || attempts >= maxAttempts) {
                onProgress?.(90, 'Finalizing...');
                
                // Small delay to show finalizing state
                setTimeout(() => {
                  onProgress?.(100, `Complete! Reduced by ${compressionRatio}%`);
                  resolve(blob);
                }, 100);
              } else {
                // Reduce quality more aggressively for very large files
                const qualityReduction = blob.size > maxSizeKB * 1024 * 2 ? 0.15 : 0.08;
                quality -= qualityReduction;
                compress();
              }
            },
            outputFormat,
            quality
          );
        };

        compress();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validates image file type and size before compression
 */
export const validateImageFile = (file: File, maxSizeMB: number = 15): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  
  // Check file type
  if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return { valid: false, error: 'Please upload a valid image (JPEG, PNG, or WebP)' };
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image size must be less than ${maxSizeMB}MB` };
  }
  
  return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
