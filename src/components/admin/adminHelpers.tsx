import React from 'react'

// --- Shared constants --------------------------------------------------------

export const PIE_COLORS = ['#2F3E8F', '#10b981', '#60a5fa', '#ef4444', '#8b5cf6']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pieLabel = (fn: (entry: any) => string) => fn as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fmtTooltip = (fn: (v: number | string) => [string, string]) => fn as any

// --- Shared UI components ----------------------------------------------------

export function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
      <div className="flex items-center justify-between">
        <p className="text-[#B8A090] text-sm">{label}</p>
        {icon && <span className="text-[#8B7355]">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-[#8B7355] text-xs mt-1">{sub}</p>}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[#E2DBCE] font-semibold text-sm uppercase tracking-wider mb-3">{children}</h3>
}

export function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[#2F3E8F] font-semibold text-xs uppercase tracking-widest mb-4 mt-2 border-b border-[#5A4333] pb-2">{children}</h4>
}

export function EmptyMsg({ msg = 'No data yet' }: { msg?: string }) {
  return <p className="text-[#8B7355] text-sm py-8 text-center">{msg}</p>
}

// --- Shared fetch helper -----------------------------------------------------

export function adminAuthHeaders(adminToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }
}
