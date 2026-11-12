import React from 'react';
import { SeverityTier } from '../types';
import { AlertTriangle, AlertCircle, Info, Flame } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityTier;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  score,
  showScore = false,
  size = 'md'
}) => {
  const configs = {
    Low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: Info,
      label: 'Low Severity'
    },
    Medium: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      icon: AlertCircle,
      label: 'Medium Severity'
    },
    High: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
      icon: AlertTriangle,
      label: 'High Severity'
    },
    Critical: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      icon: Flame,
      label: 'Critical Hazard'
    }
  };

  const config = configs[severity] || configs.Medium;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs transition-colors ${config.bg} ${sizeClasses[size]}`}
      title={`Damage severity: ${severity}${score ? ` (${score}/100)` : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{severity}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75 font-mono text-[11px] ml-0.5">
          ({Math.round(score)}%)
        </span>
      )}
    </span>
  );
};
