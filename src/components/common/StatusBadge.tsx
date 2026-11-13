import React from 'react';
import { TaskStatus } from '../../types';
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PauseCircle,
  Rocket,
  XCircle,
} from 'lucide-react';

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
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-400/20',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: Clock,
        textColor: 'text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      };
    case 'on_hold':
      return {
        label: 'On Hold',
        icon: PauseCircle,
        textColor: 'text-amber-600 dark:text-amber-400',
        dotColor: 'bg-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
      };
    case 'in_review':
      return {
        label: 'Ready for Review',
        icon: HelpCircle,
        textColor: 'text-purple-600 dark:text-purple-400',
        dotColor: 'bg-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      };
    case 'changes_requested':
      return {
        label: 'Changes Requested',
        icon: AlertCircle,
        textColor: 'text-rose-600 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
      };
    case 'ready_for_deployment':
      return {
        label: 'Ready for Deployment',
        icon: Rocket,
        textColor: 'text-cyan-600 dark:text-cyan-400',
        dotColor: 'bg-cyan-500',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        textColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircle,
        textColor: 'text-slate-500 dark:text-slate-500',
        dotColor: 'bg-slate-500',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
      };
    default:
      return {
        label: status,
        icon: Circle,
        textColor: 'text-slate-500',
        dotColor: 'bg-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-400/20',
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
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />}
      <span>{config.label}</span>
    </span>
  );
};
