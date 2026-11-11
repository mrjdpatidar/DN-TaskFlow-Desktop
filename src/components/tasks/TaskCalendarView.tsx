import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Task } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { PriorityIcon } from '../common/PriorityIcon';

export const TaskCalendarView: React.FC = () => {
  const {
    tasks,
    projects,
    currentOrgId,
    selectedProjectId,
    setActiveTaskId,
    setCreateTaskOpen,
  } = useTaskFlowStore();

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const orgTasks = tasks.filter((t) => {
    if (t.organizationId !== currentOrgId || t.isArchived) return false;
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    return Boolean(t.dueDate);
  });

  // Build grid days (42 slots: 6 weeks)
  const days = [];
  // Days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`,
    });
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      dayNumber: i,
      isCurrentMonth: true,
      dateString: dStr,
    });
  }
  // Remaining slots to fill 35 or 42
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Month Navigation Header */}
      <div className="px-6 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <span>{monthNames[month]} {year}</span>
          </h2>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setCreateTaskOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/5 text-center py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 bg-black/5 dark:bg-white/5">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Days Matrix */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-black/5 dark:bg-white/5 p-px overflow-y-auto">
        {days.map((slot, index) => {
          const isToday = slot.dateString === todayStr;
          const dayTasks = orgTasks.filter((t) => t.dueDate?.slice(0, 10) === slot.dateString);

          return (
            <div
              key={index}
              className={`min-h-[90px] p-2 flex flex-col justify-between glass-panel transition-colors ${
                slot.isCurrentMonth
                  ? 'bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200'
                  : 'bg-white/30 dark:bg-slate-900/30 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-medium w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-indigo-600 text-white font-bold' : ''
                  }`}
                >
                  {slot.dayNumber}
                </span>

                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              {/* Day Tasks List */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
                {dayTasks.map((t) => {
                  const project = projects.find((p) => p.id === t.projectId);
                  const isCompleted = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveTaskId(t.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium truncate cursor-pointer transition-all border flex items-center gap-1.5 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 line-through opacity-75'
                          : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 hover:border-indigo-500/40'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: project?.color || '#6366f1' }}
                      />
                      <span className="truncate">{t.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
