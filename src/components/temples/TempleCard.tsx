import { MapPin, Gem, Image, Users } from 'lucide-react';
import type { Temple } from '@/data/temples/types';

interface TempleCardProps {
  temple: Temple;
  connectionReason?: string;
  connectionType?: string;
  onClick: () => void;
  memoryCount?: number;
  memberCount?: number;
  memberAvatars?: Array<{ personId: string; firstName: string; profilePhotoUrl: string | null }>;
  showActions?: boolean;
  onAddMemory?: () => void;
}

const DEITY_GRADIENTS: Record<string, string> = {
  Shiva: 'from-[#2F3E8F] to-[#25327A]',
  Vishnu: 'from-[#C2A46D] to-[#2F3E8F]',
  Brahma: 'from-[#2F3E8F] to-[#1E2A6B]',
  Durga: 'from-[#4B2C5E] to-[#2F3E8F]',
  Parvati: 'from-[#4B2C5E] to-[#2F3E8F]',
  Ganesha: 'from-[#C2A46D] to-[#A8894F]',
  Hanuman: 'from-[#2F3E8F] to-[#25327A]',
  Krishna: 'from-[#25327A] to-[#2F3E8F]',
  Rama: 'from-[#2F3E8F] to-[#4B2C5E]',
  Lakshmi: 'from-[#C2A46D] to-[#4B2C5E]',
  Saraswati: 'from-[#2F3E8F] to-[#4B2C5E]',
  Murugan: 'from-[#2F3E8F] to-[#25327A]',
  Ayyappa: 'from-[#25327A] to-[#2F3E8F]',
};

const DEITY_BADGE_COLORS: Record<string, string> = {
  Shiva: 'bg-[#2F3E8F]/80 text-white',
  Vishnu: 'bg-[#C2A46D]/80 text-white',
  Brahma: 'bg-[#2F3E8F]/80 text-white',
  Durga: 'bg-[#4B2C5E]/80 text-white',
  Parvati: 'bg-[#4B2C5E]/80 text-white',
  Ganesha: 'bg-[#C2A46D]/80 text-white',
  Hanuman: 'bg-[#2F3E8F]/80 text-white',
  Krishna: 'bg-[#2F3E8F]/80 text-white',
  Rama: 'bg-[#2F3E8F]/80 text-white',
  Lakshmi: 'bg-[#C2A46D]/80 text-white',
  Saraswati: 'bg-[#2F3E8F]/80 text-white',
  Murugan: 'bg-[#2F3E8F]/80 text-white',
  Ayyappa: 'bg-[#2F3E8F]/80 text-white',
};

export function TempleCard({ temple, connectionReason, onClick, memoryCount, memberCount, memberAvatars, showActions, onAddMemory }: TempleCardProps) {
  const gradient = (temple.deity ? DEITY_GRADIENTS[temple.deity] : undefined) ?? 'from-[#2F3E8F] to-[#25327A]';
  const deityBadge = (temple.deity ? DEITY_BADGE_COLORS[temple.deity] : undefined) ?? 'bg-[#2F3E8F]/70 text-white';

  return (
    <div
      className="w-full text-left bg-white dark:bg-[#1a1a1a] rounded-2xl border border-[#DBEAFE] dark:border-[#2a2a2a] overflow-hidden hover:border-[#2F3E8F]/30 dark:hover:border-[#2F3E8F]/30 hover:scale-[1.01] transition-all duration-200 cursor-pointer group flex flex-col animate-fade-in-up"
      onClick={onClick}
      style={{ minHeight: '210px', boxShadow: '0 8px 24px rgba(47, 62, 143, 0.06), 0 2px 8px rgba(0,0,0,0.04)' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(47, 62, 143, 0.12), 0 4px 12px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(47, 62, 143, 0.06), 0 2px 8px rgba(0,0,0,0.04)'; }}
    >
      {/* Image / Gradient hero region */}
      <div className={`relative bg-gradient-to-br ${gradient} flex-shrink-0`} style={{ height: '100px' }}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />

        {/* Deity/category badge � top left */}
        {(temple.deity || temple.category) && (
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${deityBadge}`}>
              {temple.deity ?? temple.category}
            </span>
          </div>
        )}

        {/* State badge � top right */}
        {temple.state && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/30 text-white/90 backdrop-blur-sm truncate max-w-[80px] block">
              {temple.state}
            </span>
          </div>
        )}

        {/* Memory count badge � bottom right */}
        {memoryCount !== undefined && memoryCount > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
              <Image className="w-2.5 h-2.5" />
              {memoryCount}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col p-3">
        {/* Name + location */}
        <h3 className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] leading-tight line-clamp-2 mb-1">
          {temple.name}
        </h3>
        {(temple.location || temple.state) && (
          <div className="flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 text-[#8B7355] dark:text-[#A19F9D] shrink-0" />
            <span className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">
              {temple.location ? `${temple.location}, ${temple.state}` : temple.state}
            </span>
          </div>
        )}

        {/* Connection reason */}
        {connectionReason && (
          <div className="flex items-start gap-1.5 bg-[#F4F6FA] dark:bg-[#1E1E1E] border border-[#DBEAFE] dark:border-[#2a2a2a] rounded-lg px-2 py-1.5 mb-2">
            <Gem className="w-3 h-3 text-[#2F3E8F] shrink-0 mt-0.5" />
            <span className="text-[10px] text-[#6B5E4F] dark:text-[#B8A090] leading-snug line-clamp-2">
              {connectionReason}
            </span>
          </div>
        )}

        {/* Info excerpt */}
        {!connectionReason && temple.info && (
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] line-clamp-2 leading-relaxed mb-2">
            {temple.info.replace(/\*\*/g, '').replace(/\*/g, '').slice(0, 120)}
          </p>
        )}

        {/* Member avatars */}
        {memberAvatars && memberAvatars.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex -space-x-1">
              {memberAvatars.slice(0, 3).map(m => (
                <div key={m.personId} className="w-5 h-5 rounded-full border border-white dark:border-[#1a1a1a] overflow-hidden bg-[#2F3E8F]/20 flex items-center justify-center">
                  {m.profilePhotoUrl
                    ? <img src={m.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                    : <span className="text-[8px] font-bold text-[#2F3E8F]">{m.firstName[0]}</span>
                  }
                </div>
              ))}
            </div>
            {memberCount !== undefined && memberCount > 3 && (
              <span className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">+{memberCount - 3} more</span>
            )}
          </div>
        )}
        {!memberAvatars?.length && memberCount !== undefined && memberCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Users className="w-3 h-3 text-[#8B7355] dark:text-[#A19F9D]" />
            <span className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">{memberCount} members</span>
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Learn More button */}
        <div className="pt-2 mt-1 border-t border-[#DBEAFE]/60 dark:border-[#2a2a2a]/40 flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(180deg, #2F3E8F 0%, #25327A 100%)', boxShadow: '0 2px 8px rgba(47, 62, 143, 0.25)' }}
          >
            Learn More
          </span>
          <span className="flex-1" />
          {showActions && onAddMemory && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddMemory(); }}
              className="text-[11px] font-medium text-[#6B5E4F] dark:text-[#B8A090] px-2 py-1 rounded-lg border border-[#DBEAFE] dark:border-[#2a2a2a] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"
            >
              + Memory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
