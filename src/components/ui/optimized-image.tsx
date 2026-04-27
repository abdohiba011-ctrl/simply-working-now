import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  priority?: boolean;
  aspectRatio?: string;
  sizes?: string;
  srcSet?: string;
  sources?: {
    src: string;
    width: number;
  }[];
}

const generateSrcSet = (sources: { src: string; width: number }[]): string => {
  return sources.map(({ src, width }) => `${src} ${width}w`).join(', ');
};

/** Synchronous browser-cache check — same trick as ResponsiveImage. */
const isImageCached = (src?: string): boolean => {
  if (!src || typeof Image === 'undefined') return false;
  try {
    const img = new Image();
    img.src = src;
    return img.complete && img.naturalWidth > 0;
  } catch {
    return false;
  }
};

export const OptimizedImage = memo(({
  src,
  alt,
  className,
  fallback = '/placeholder.svg',
  priority = false,
  aspectRatio,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  srcSet,
  sources,
  width,
  height,
  ...props
}: OptimizedImageProps) => {
  const cached = isImageCached(src);
  const [isLoaded, setIsLoaded] = useState(cached);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority || cached);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalHeight !== 0) {
      setIsLoaded(true);
    }
  }, [src, isInView]);

  const containerStyle = aspectRatio ? { aspectRatio } : undefined;
  const computedSrcSet = srcSet || (sources ? generateSrcSet(sources) : undefined);

  // Generate WebP source if possible
  const webpSrc = src?.endsWith('.jpg') || src?.endsWith('.jpeg') || src?.endsWith('.png')
    ? src.replace(/\.(jpg|jpeg|png)$/, '.webp')
    : null;

  const skipTransition = priority || cached;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden', className)}
      style={containerStyle}
    >
      {isInView ? (
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            ref={imgRef}
            src={error ? fallback : src}
            srcSet={error ? undefined : computedSrcSet}
            sizes={computedSrcSet ? sizes : undefined}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            width={width}
            height={height}
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              'w-full h-full object-cover',
              !skipTransition && 'transition-opacity duration-300',
              isLoaded || skipTransition ? 'opacity-100' : 'opacity-0',
            )}
            {...props}
          />
        </picture>
      ) : (
        <div
          className="w-full h-full bg-muted animate-pulse"
          style={containerStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
