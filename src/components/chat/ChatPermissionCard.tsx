/**
 * ChatPermissionCard — UI for granting/denying data access permission.
 *
 * Rendered inline when the AI needs to access family data.
 * Gold accent border for heritage feel.
 */

import { Shield, ShieldCheck, ShieldX } from 'lucide-react'

interface ChatPermissionCardProps {
  scope: string
  reason: string
  onGrant: (scope: string) => void
  onDeny: () => void
}

export function ChatPermissionCard({ scope, reason, onGrant, onDeny }: ChatPermissionCardProps) {
  const scopeLabel = scope === 'statistics' ? 'aggregate statistics' : 'individual family data'

  return (
    <div className="mt-2 rounded-xl border border-[#C2A46D]/50 dark:border-[#D4B47A]/30
                    bg-[#EFE6D6]/50 dark:bg-[#2A241B]/50 p-3 max-w-full">
      <div className="flex items-start gap-2 mb-2">
        <Shield className="w-4 h-4 text-[#C2A46D] dark:text-[#D4B47A] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-gray-800 dark:text-[#F5F1E8]">
            Data Access Request
          </p>
          <p className="text-[11px] text-[#8B7355] dark:text-gray-400 mt-0.5">
            I need access to your {scopeLabel} to answer this question.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onGrant(scope)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium
                     bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white
                     hover:bg-[#3B4DA6] dark:hover:bg-[#6C7CFF]
                     transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Allow
        </button>
        <button
          onClick={onDeny}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium
                     bg-[#ECE7DF] dark:bg-[#333] text-gray-700 dark:text-gray-300
                     hover:bg-[#DDD6C8] dark:hover:bg-[#444]
                     transition-colors"
        >
          <ShieldX className="w-3.5 h-3.5" />
          Deny
        </button>
      </div>
    </div>
  )
}
