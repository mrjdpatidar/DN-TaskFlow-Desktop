import React from 'react';
import { TaskStatus } from '../../types';
import { Circle, Clock, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
  showIcon?: boolean;
  className?: string;
}

export const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case 'todo':
      return {
        label: 'To Do',
        icon: Circle,
        textColor: 'text-slate-600 dark:text-slate-400',
        dotColor: 'bg-slate-400',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: Clock,
        textColor: 'text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-500',
      };
    case 'in_review':
      return {
        label: 'In Review',
        icon: HelpCircle,
        textColor: 'text-amber-600 dark:text-amber-400',
        dotColor: 'bg-amber-500',
      };
    case 'blocked':
      return {
        label: 'Blocked',
        icon: AlertOctagon,
        textColor: 'text-rose-600 dark:text-rose-400',
        dotColor: 'bg-rose-500',
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        textColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
      };
    default:
      return {
        label: status,
        icon: Circle,
        textColor: 'text-slate-500',
        dotColor: 'bg-slate-400',
      };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-tight whitespace-nowrap ${config.textColor} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />}
      <span>{config.label}</span>
    </span>
  );
};
