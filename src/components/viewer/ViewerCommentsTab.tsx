/**
 * ViewerCommentsTab - Comments tab for FullPageMediaViewer
 * Includes ContributionRequest for "Ask Family" feature
 */

import { MemoryCommentsSection } from '@/components/panels/MemoryCommentsSection';
import { ContributionRequest } from '@/components/viewer/ContributionRequest';
import type { Memory } from '@/types';

interface ViewerCommentsTabProps {
  memory: Memory;
  currentUserId: string;
  currentUserName: string;
}

export function ViewerCommentsTab({ memory, currentUserId, currentUserName }: ViewerCommentsTabProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Comments</h3>
      <MemoryCommentsSection
        memoryId={memory.memoryId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
      <ContributionRequest
        memory={memory}
        currentUserName={currentUserName}
        onContributed={() => {
          // Comments section will auto-refresh on next view
        }}
      />
    </div>
  );
}
