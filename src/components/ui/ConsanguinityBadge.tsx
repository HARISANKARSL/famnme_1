/**
 * ConsanguinityBadge - Color-coded coefficient badge
 *
 * Displays Wright's path coefficient with color coding:
 * - Green (none): 0
 * - Yellow (low): < 0.0156
 * - Orange (moderate): < 0.0625
 * - Red (high): >= 0.0625
 */

interface ConsanguinityBadgeProps {
  coefficient: number;
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  description: string;
  compact?: boolean;
}

const RISK_COLORS = {
  none: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  low: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  moderate: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

export function ConsanguinityBadge({
  coefficient,
  riskLevel,
  description,
  compact = false,
}: ConsanguinityBadgeProps) {
  const colors = RISK_COLORS[riskLevel];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
        title={`${description} (F = ${coefficient})`}
      >
        F = {coefficient.toFixed(4)}
      </span>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${colors.text}`}>
          Consanguinity Coefficient
        </span>
        <span className={`text-lg font-bold ${colors.text}`}>
          {coefficient.toFixed(4)}
        </span>
      </div>
      <p className={`text-xs mt-1 ${colors.text} opacity-80`}>
        {description}
      </p>
    </div>
  );
}
