import React, { useState, useMemo } from 'react';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-video',
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Normalize image src: if base64 string without data prefix, prepend data:image/jpeg;base64,
  const normalizedSrc = useMemo(() => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
      return src;
    }
    // Check if raw base64
    if (src.length > 50 && !src.includes(' ')) {
      return `data:image/jpeg;base64,${src}`;
    }
    return src;
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-slate-800 ${aspectRatio} ${className}`}>
      {/* Blurred placeholder box */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {error || !normalizedSrc ? (
        <div className="absolute inset-0 bg-slate-800/90 flex flex-col items-center justify-center text-slate-400 p-2 text-center text-xs">
          <svg className="w-6 h-6 mb-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Image unavailable
        </div>
      ) : (
        <img
          src={normalizedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};

export default ProgressiveImage;
