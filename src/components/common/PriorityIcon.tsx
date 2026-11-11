import React from 'react';
import { TaskPriority } from '../../types';
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from 'lucide-react';

interface PriorityIconProps {
  priority: TaskPriority;
  showLabel?: boolean;
  className?: string;
}

export const getPriorityConfig = (priority: TaskPriority) => {
  switch (priority) {
    case 'low':
      return {
        label: 'Low',
        icon: ArrowDown,
        textColor: 'text-slate-500 dark:text-slate-400',
        colorClass: 'text-slate-400',
      };
    case 'medium':
      return {
        label: 'Medium',
        icon: Minus,
        textColor: 'text-blue-600 dark:text-blue-400',
        colorClass: 'text-blue-500',
      };
    case 'high':
      return {
        label: 'High',
        icon: ArrowUp,
        textColor: 'text-amber-600 dark:text-amber-400',
        colorClass: 'text-amber-500',
      };
    case 'urgent':
      return {
        label: 'Urgent',
        icon: AlertTriangle,
        textColor: 'text-rose-600 dark:text-rose-400',
        colorClass: 'text-rose-500',
      };
    default:
      return {
        label: priority,
        icon: Minus,
        textColor: 'text-slate-400',
        colorClass: 'text-slate-400',
      };
  }
};

export const PriorityIcon: React.FC<PriorityIconProps> = ({
  priority,
  showLabel = false,
  className = '',
}) => {
  const config = getPriorityConfig(priority);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${config.textColor} ${className}`}
      title={`Priority: ${config.label}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${config.colorClass}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
