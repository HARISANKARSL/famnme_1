import { X, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';

export interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export function ProfilePanel({ isOpen, onClose, onOpenSettings }: ProfilePanelProps) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  if (!isOpen) return null;

  const fullName = user?.fullName || 'User';
  const email = user?.email || '';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleOpenSettings = () => {
    onOpenSettings?.();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 bottom-0 w-full sm:w-80'} bg-white shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex flex-col items-center p-6 border-b border-gray-200">
          <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-sky-700">{initials}</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{fullName}</p>
          {email && (
            <p className="text-sm text-gray-500 mt-0.5">{email}</p>
          )}
        </div>

        {/* Actions */}
        <div className={`flex-1 p-4 ${isMobile ? 'pb-16' : ''}`}>
          {onOpenSettings && (
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Tree Settings</span>
            </button>
          )}
        </div>

        {/* Footer: Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-red-600 font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
