export type ProfileTabId = 'facts' | 'gallery' | 'life-story' | 'notes' | 'history';

interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
}

const TABS: Array<{ id: ProfileTabId; label: string }> = [
  { id: 'facts', label: 'Facts' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'life-story', label: 'Life Story' },
  // { id: 'notes', label: 'Notes & Comments' },
  // { id: 'history', label: 'History' },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="bg-[#F9FAFB] dark:bg-[#1A1A1A] border-b border-[#E2E8F0] dark:border-[#2a2a2a] sticky top-0 z-30">
      <div className="flex justify-center">
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-[#2F3E8F] text-[#2F3E8F] dark:border-[#8CA0FF] dark:text-[#8CA0FF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-[#B8A090] dark:hover:border-stone-750'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
