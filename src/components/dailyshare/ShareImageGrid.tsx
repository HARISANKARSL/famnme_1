/**
 * ShareImageGrid — Responsive image grid for multi-image posts (1-4 images)
 */

import { useState } from 'react';

interface ShareImageGridProps {
  urls: string[];
  onImageClick?: (index: number) => void;
}

export function ShareImageGrid({ urls, onImageClick }: ShareImageGridProps) {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const handleError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  // Track original indices through the filter so click passes the right index
  const validEntries = urls
    .map((url, originalIndex) => ({ url, originalIndex }))
    .filter(({ originalIndex }) => !failedImages.has(originalIndex));

  if (validEntries.length === 0) return null;

  const imgClass = 'w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity';
  const click = (originalIndex: number) => onImageClick?.(originalIndex);

  if (validEntries.length === 1) {
    const { url, originalIndex } = validEntries[0];
    return (
      <div className="max-h-[500px] bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-center">
        <img
          src={url}
          alt="Post image"
          className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
          onError={() => handleError(originalIndex)}
          onClick={() => click(originalIndex)}
        />
      </div>
    );
  }

  if (validEntries.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 max-h-[220px] md:max-h-[300px]">
        {validEntries.map(({ url, originalIndex }) => (
          <img
            key={originalIndex}
            src={url}
            alt={`Post image ${originalIndex + 1}`}
            className={imgClass}
            onError={() => handleError(originalIndex)}
            onClick={() => click(originalIndex)}
          />
        ))}
      </div>
    );
  }

  if (validEntries.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 max-h-[220px] md:max-h-[300px]">
        {validEntries.map(({ url, originalIndex }, gridIdx) => (
          <img
            key={originalIndex}
            src={url}
            alt={`Post image ${originalIndex + 1}`}
            className={gridIdx === 0 ? `${imgClass} row-span-2` : imgClass}
            onError={() => handleError(originalIndex)}
            onClick={() => click(originalIndex)}
          />
        ))}
      </div>
    );
  }

  // 4 images
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 max-h-[220px] md:max-h-[300px]">
      {validEntries.slice(0, 4).map(({ url, originalIndex }) => (
        <img
          key={originalIndex}
          src={url}
          alt={`Post image ${originalIndex + 1}`}
          className={imgClass}
          onError={() => handleError(originalIndex)}
          onClick={() => click(originalIndex)}
        />
      ))}
    </div>
  );
}
