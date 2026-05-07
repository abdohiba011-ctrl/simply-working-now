import { memo } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
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
  const [error, setError] = useState(false);

  const containerStyle = aspectRatio ? { aspectRatio } : undefined;
  const computedSrcSet = srcSet || (sources ? generateSrcSet(sources) : undefined);

  return (
    <div
      className={cn('overflow-hidden', className)}
      style={containerStyle}
    >
      <img
        src={error ? fallback : src}
        srcSet={error ? undefined : computedSrcSet}
        sizes={computedSrcSet ? sizes : undefined}
        alt={alt}
        loading="eager"
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        width={width}
        height={height}
        onError={() => setError(true)}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
});

ResponsiveImage.displayName = 'ResponsiveImage';
