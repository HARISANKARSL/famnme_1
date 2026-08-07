import { Network, Lock } from 'lucide-react'

export function ConnectionsTeaserCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-dashed border-[#C2A46D]/50 bg-gradient-to-br from-[#F6F2EA] to-[#E8DFCC] dark:from-[#2A241E] dark:to-[#1F1C18] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C2A46D] to-[#8B7355] flex items-center justify-center shadow">
          <Network className="w-5 h-5 text-white" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] md:text-[16px] font-semibold text-[#3D2E1F] dark:text-[#F3E9DC]">
              Connections
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C2A46D]/[0.18] text-[#8B6914] border border-[#C2A46D]/40">
              <Lock className="w-2.5 h-2.5" />
              Coming soon
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-[#5C4A2E] dark:text-[#C9BDA8]">
            Soon you'll discover people who share your surname, gotra, or native place — possible distant relatives and community connections.
          </p>
        </div>
      </div>
    </div>
  )
}
