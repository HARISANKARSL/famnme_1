/**
 * SmartSuggestion - Contextual next-step suggestions after adding a family member
 *
 * Shows helpful prompts like:
 * - "Add mother" after adding father
 * - "Add children" after adding spouse
 * - "Add siblings" after adding first child
 *
 * Auto-dismisses after 8 seconds or manual close
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, UserPlus, Heart, Baby, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartSuggestionProps {
  show: boolean;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  icon?: 'user' | 'heart' | 'baby' | 'users';
  autoDismissMs?: number;
}

const iconMap = {
  user: UserPlus,
  heart: Heart,
  baby: Baby,
  users: Users,
};

export function SmartSuggestion({
  show,
  message,
  actionLabel,
  onAction,
  onDismiss,
  icon = 'user',
  autoDismissMs = 8000,
}: SmartSuggestionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = iconMap[icon];

  useEffect(() => {
    if (show) {
      // Delay for smooth entrance
      const showTimer = setTimeout(() => setIsVisible(true), 100);

      // Auto-dismiss after delay
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, autoDismissMs);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [show, autoDismissMs, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  };

  const handleAction = () => {
    onAction();
    handleDismiss();
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-50',
        'bg-white border border-gray-200 rounded-lg shadow-2xl',
        'px-5 py-4 flex items-center gap-4',
        'transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      style={{ minWidth: '400px', maxWidth: '500px' }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#2F3E8F]" />
        </div>
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{message}</p>
      </div>

      {/* Action Button */}
      <Button
        onClick={handleAction}
        size="sm"
        className="flex items-center gap-1.5"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
