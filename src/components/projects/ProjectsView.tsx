import React from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Avatar } from '../common/Avatar';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Trash2,
  ArrowRight,
  Pencil,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    tasks,
    users,
    currentOrgId,
    selectProject,
    setActiveTab,
    setCreateProjectOpen,
    setEditingProject,
    archiveProject,
    deleteProject,
  } = useTaskFlowStore();

  const orgProjects = projects.filter((p) => p.organizationId === currentOrgId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Projects Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize workloads, monitor completion milestones, and view team task distributions.
          </p>
        </div>

        <button
          onClick={() => setCreateProjectOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orgProjects.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.isArchived);
          const totalTasks = projectTasks.length;
          const completedTasks = projectTasks.filter((t) => t.status === 'completed').length;
          const pendingTasks = totalTasks - completedTasks;
          const overdueTasks = projectTasks.filter((t) => {
            if (t.status === 'completed' || !t.dueDate) return false;
            return new Date(t.dueDate).getTime() < Date.now();
          }).length;

          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          const projectMembers = users.filter((u) => project.memberIds.includes(u.id));

          return (
            <div
              key={project.id}
              onClick={() => {
                selectProject(project.id);
                setActiveTab('board');
              }}
              className="group glass-panel rounded-2xl p-5 border border-black/5 dark:border-white/5 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingProject(project);
                        setCreateProjectOpen(true);
                      }}
                      title="Edit Project"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => archiveProject(project.id)}
                      title={project.status === 'archived' ? 'Activate' : 'Archive'}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      title="Delete Project"
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                  {project.description || 'No description provided.'}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Progress</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: project.color || '#6366f1',
                      }}
                    />
                  </div>
                </div>

                {/* Task Breakdown Stats */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-black/5 dark:border-white/5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Done</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {completedTasks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Pending</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {pendingTasks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Overdue</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {overdueTasks}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer: Due date + Member avatars */}
              <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="tabular-nums">
                    {project.dueDate ? new Date(project.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                  </span>
                </div>

                <div className="flex -space-x-1.5 overflow-hidden">
                  {projectMembers.map((m) => (
                    <Avatar key={m.id} name={m.name} avatarUrl={m.avatar} size="xs" />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
