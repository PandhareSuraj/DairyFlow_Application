import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function OptimizedImage({ fallback = '/placeholder.svg', onError, ...props }: OptimizedImageProps) {
  return (
    <img
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.src = fallback;
        onError?.(e);
      }}
      {...props}
    />
  );
}
