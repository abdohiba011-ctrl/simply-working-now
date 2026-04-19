import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  priority?: boolean;
  aspectRatio?: string;
  sizes?: string;
  // Provide srcset images for different breakpoints
  srcSet?: string;
  // Or provide multiple sources for automatic srcset generation
  sources?: {
    src: string;
    width: number;
  }[];
}

/**
 * Generates srcset string from sources array
 */
const generateSrcSet = (sources: { src: string; width: number }[]): string => {
  return sources.map(({ src, width }) => `${src} ${width}w`).join(', ');
};

export const ResponsiveImage = memo(({
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
}: ResponsiveImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

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
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalHeight !== 0) {
      setIsLoaded(true);
    }
  }, [src, isInView]);

  const containerStyle = aspectRatio ? { aspectRatio } : undefined;
  
  // Generate srcSet from sources if provided
  const computedSrcSet = srcSet || (sources ? generateSrcSet(sources) : undefined);

  return (
    <div 
      ref={containerRef} 
      className={cn('overflow-hidden', className)}
      style={containerStyle}
    >
      {isInView ? (
        <img
          ref={imgRef}
          src={error ? fallback : src}
          srcSet={error ? undefined : computedSrcSet}
          sizes={computedSrcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
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

ResponsiveImage.displayName = 'ResponsiveImage';
