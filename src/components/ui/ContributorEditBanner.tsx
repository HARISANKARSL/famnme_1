/**
 * ContributorEditBanner — amber banner shown in edit modals for contributors.
 * "Your changes will be submitted for review by [Owner Name]"
 */

interface ContributorEditBannerProps {
  ownerName: string
}

export function ContributorEditBanner({ ownerName }: ContributorEditBannerProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-amber-800">
        Your changes will be submitted for review by <span className="font-medium">{ownerName}</span>
      </p>
    </div>
  )
}
