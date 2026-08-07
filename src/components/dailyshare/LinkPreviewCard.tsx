/**
 * LinkPreviewCard — OG metadata preview card for link posts
 */

import { ExternalLink } from 'lucide-react';

interface LinkPreviewCardProps {
  url: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export function LinkPreviewCard({ url, title, description, imageUrl }: LinkPreviewCardProps) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-xl overflow-hidden hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
    >
      {imageUrl && (
        <div className="w-full h-32 md:h-40 bg-[#F5F0EB] dark:bg-[#1e1e1e]">
          <img
            src={imageUrl}
            alt={title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        {title && (
          <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] line-clamp-2">
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs text-[#8B7355] dark:text-[#A19F9D] mt-1 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-[#8B7355] dark:text-[#A19F9D]">
          <ExternalLink className="h-3 w-3" />
          <span>{domain}</span>
        </div>
      </div>
    </a>
  );
}
