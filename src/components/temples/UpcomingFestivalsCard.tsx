/**
 * UpcomingFestivalsCard � Shows the next 1-3 festivals coming up at the user's
 * connected temples, within the next 90 days.
 */

import { useMemo } from 'react';
import { Calendar, Star } from 'lucide-react';
import { getTempleById } from '@/data/temples';
import { getFestivalsForTemple } from '@/data/temples/templeFestivals';
import type { TempleLink } from '@/types';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';

const HINDU_FESTIVAL_DATES_2026: Record<string, string> = {
  'Makaravilakku':       '2026-01-14',
  'Rathasapthami':       '2026-01-27',
  'Thai Poosam':         '2026-01-25',
  'Maha Shivaratri':     '2026-02-26',
  'Panguni Uthiram':     '2026-04-06',
  'Panguni Thirunal':    '2026-04-06',
  'Vishu':               '2026-04-14',
  'Chithirai Festival':  '2026-04-14',
  'Ekadashi':            '2026-04-10',
  'Edavalapathiyam':     '2026-06-15',
  'Ashtami Rohini':      '2026-08-26',
  'Adi Pooram':          '2026-08-15',
  'Brahmotsavam':        '2026-10-05',
  'Navaratri':           '2026-10-13',
  'Arattu':              '2026-10-30',
  'Alpashy Thirunal':    '2026-10-20',
  'Skanda Sashti':       '2026-11-09',
  'Laksha Deepam':       '2026-11-12',
  'Guruvayur Utsavam':   '2026-11-20',
  'Pallivetta':          '2026-11-28',
  'Mandalam':            '2026-12-15',
  'Karthigai Deepam':    '2026-12-10',
  'Vaikunta Ekadashi':   '2026-12-22',
};

const CHRISTIAN_FESTIVAL_DATES_2026: Record<string, string> = {
  'Epiphany':            '2026-01-06',
  'Ash Wednesday':       '2026-02-18',
  'Lent Begins':         '2026-02-18',
  'Palm Sunday':         '2026-03-29',
  'Good Friday':         '2026-04-03',
  'Easter Sunday':       '2026-04-05',
  'Ascension Day':       '2026-05-14',
  'Pentecost':           '2026-05-24',
  'Assumption of Mary':  '2026-08-15',
  'All Saints Day':      '2026-11-01',
  'Advent Begins':       '2026-11-29',
  'Christmas Eve':       '2026-12-24',
  'Christmas Day':       '2026-12-25',
};

const MUSLIM_FESTIVAL_DATES_2026: Record<string, string> = {
  'Isra Mi\'raj':        '2026-01-16',
  'Shab-e-Barat':        '2026-02-02',
  'Ramadan Begins':      '2026-02-17',
  'Laylat al-Qadr':      '2026-03-14',
  'Eid al-Fitr':         '2026-03-19',
  'Hajj Season':         '2026-05-24',
  'Eid al-Adha':         '2026-05-26',
  'Islamic New Year':    '2026-06-16',
  'Ashura':              '2026-06-25',
  'Milad-un-Nabi':       '2026-08-25',
};

function getFestivalDatesForFaith(faith: FaithContext): Record<string, string> {
  if (faith === 'Christian') return CHRISTIAN_FESTIVAL_DATES_2026;
  if (faith === 'Islam') return MUSLIM_FESTIVAL_DATES_2026;
  return HINDU_FESTIVAL_DATES_2026;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFestivalDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface UpcomingItem {
  festivalName: string;
  templeName: string;
  daysUntil: number;
  dateStr: string;
}

interface UpcomingFestivalsCardProps {
  myTempleLinks: TempleLink[];
  faithContext?: FaithContext;
  onLearnAbout?: (templeId: string, templeName: string) => void;
  embedded?: boolean;
}

export function UpcomingFestivalsCard({ myTempleLinks, faithContext, onLearnAbout, embedded }: UpcomingFestivalsCardProps) {
  const upcomingItems = useMemo<(UpcomingItem & { templeId: string })[]>(() => {
    const items: (UpcomingItem & { templeId: string })[] = [];
    const seen = new Set<string>();

    // For temple-linked festivals (works for all faiths with linked temples)
    for (const link of myTempleLinks) {
      const temple = getTempleById(link.templeId);
      if (!temple) continue;
      const festivals = getFestivalsForTemple(link.templeId);
      const festivalDates = getFestivalDatesForFaith(faithContext ?? null);
      for (const fest of festivals) {
        if (seen.has(fest)) continue;
        seen.add(fest);
        const dateStr = festivalDates[fest] ?? HINDU_FESTIVAL_DATES_2026[fest];
        if (!dateStr) continue;
        const days = daysUntil(dateStr);
        if (days >= 0 && days <= 90) {
          items.push({ festivalName: fest, templeName: temple.name, daysUntil: days, dateStr, templeId: link.templeId });
        }
      }
    }

    // Also show general faith festivals even without temple links
    if (faithContext) {
      const festivalDates = getFestivalDatesForFaith(faithContext);
      const calendarName = faithContext === 'Christian' ? 'Christian Calendar'
        : faithContext === 'Islam' ? 'Islamic Calendar'
        : 'Hindu Calendar';
      for (const [fest, dateStr] of Object.entries(festivalDates)) {
        if (seen.has(fest)) continue;
        seen.add(fest);
        const days = daysUntil(dateStr);
        if (days >= 0 && days <= 90) {
          items.push({
            festivalName: fest,
            templeName: calendarName,
            daysUntil: days,
            dateStr,
            templeId: '',
          });
        }
      }
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 3);
  }, [myTempleLinks, faithContext]);

  if (upcomingItems.length === 0) return null;

  const festivalContent = (
    <>
      {!embedded && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E2DBCE]/50 dark:border-[#2a2a2a]">
        <Calendar className="w-4 h-4 text-[#C2A46D] shrink-0" />
        <p className="text-[11px] font-semibold text-[#3A342B] dark:text-[#f5f5f5] uppercase tracking-wider">
          Coming Up for Your Family
        </p>
        </div>
      )}

      <div className={embedded ? 'space-y-0.5' : 'divide-y divide-[#E2DBCE]/40 dark:divide-[#2a2a2a]/60'}>
        {upcomingItems.map((item, i) => {
          const urgencyLabel =
            item.daysUntil === 0 ? 'Today' :
            item.daysUntil === 1 ? 'Tomorrow' :
            item.daysUntil <= 7 ? `in ${item.daysUntil} days` :
            `${formatFestivalDate(item.dateStr)} \u00b7 in ${item.daysUntil}d`;

          const urgencyColor =
            item.daysUntil === 0 ? 'text-[#5A7E6A] dark:text-[#7EAA94]' :
            item.daysUntil === 1 ? 'text-[#2F3E8F] dark:text-blue-400' :
            item.daysUntil <= 7 ? 'text-[#2F3E8F]' :
            'text-[#8B7355] dark:text-[#A19F9D]';

          return (
            <div key={i} className={`flex items-center gap-2 md:gap-3 ${embedded ? 'py-2' : 'px-3 md:px-4 py-2.5 md:py-3'}`}>
              <div className="w-7 h-7 rounded-lg bg-[#EFE6D6] dark:bg-[#C2A46D]/15 flex items-center justify-center shrink-0">
                <Star className="w-3 h-3 text-[#C2A46D]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate leading-tight">
                  {item.festivalName}
                </p>
                <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate leading-tight">
                  {item.templeName}
                </p>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <span className={`text-[10px] md:text-[11px] font-medium whitespace-nowrap ${urgencyColor}`}>
                  {urgencyLabel}
                </span>
                {onLearnAbout && item.templeId && (
                  <button
                    onClick={() => onLearnAbout(item.templeId, item.templeName)}
                    className="text-[10px] md:text-[11px] font-medium text-[#2F3E8F] hover:underline whitespace-nowrap hidden sm:inline"
                  >
                    Learn about
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (embedded) return festivalContent;

  return (
    <div className="rounded-2xl bg-[#FBF7EF] dark:bg-[#1a1a1a] border border-[#E2DBCE]/80 dark:border-[#2a2a2a] overflow-hidden shadow-sm">
      {festivalContent}
    </div>
  );
}
