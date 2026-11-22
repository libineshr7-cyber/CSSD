import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, CheckSquare, Clock, AlertCircle, Calendar,
  User, Tag, CheckCircle2, LayoutGrid, List, Filter, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus, TaskPriority, Project } from '../types/database'

const STATUS_CONFIG: Record<TaskStatus, { label: string; badge: string; column: string }> = {
  todo:        { label: 'To Do',       badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', column: 'To Do' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',     column: 'In Progress' },
  review:      { label: 'Review',      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', column: 'In Review' },
  done:        { label: 'Done',        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', column: 'Completed' },
  blocked:     { label: 'Blocked',     badge: 'bg-red-500/10 text-red-400 border border-red-500/20',       column: 'Blocked' },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500',    border: 'border-l-4 border-l-red-500' },
  high:   { label: 'High',   color: 'text-orange-500', border: 'border-l-4 border-l-orange-500' },
  medium: { label: 'Medium', color: 'text-blue-500',   border: 'border-l-4 border-l-blue-500' },
  low:    { label: 'Low',    color: 'text-slate-400',  border: 'border-l-4 border-l-slate-400' },
}

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignedTo, setAssignedTo] = useState('CapeSecure Dev Team')
  const [dueDate, setDueDate] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: taskData },
        { data: projData },
      ] = await Promise.all([
        (supabase as any).from('tasks').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }),
      ])
      if (taskData) setTasks(taskData as Task[])
      if (projData) {
        setProjects(projData as Project[])
        if (projData.length > 0 && !projectId) {
          setProjectId(projData[0].id)
        }
      }
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchProj = projectFilter === 'all' || t.project_id === projectFilter
      const matchPri = priorityFilter === 'all' || t.priority === priorityFilter
      return matchSearch && matchProj && matchPri
    })
  }, [tasks, search, projectFilter, priorityFilter])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Task title is required')
      return
    }

    const newTaskData = {
      project_id: projectId || null,
      title,
      description: description || null,
      status,
      priority,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      tags: ['feature'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert([newTaskData])
        .select()
        .single()

      if (!error && data) {
        setTasks([data as Task, ...tasks])
      } else {
        setTasks([{ id: `task-${Date.now()}`, ...newTaskData } as Task, ...tasks])
      }
      setShowModal(false)
      setTitle('')
      setDescription('')
      toast.success('Task created successfully!')
    } catch (err) {
      toast.error('Failed to create task in Supabase')
    }
  }

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const completedAt = nextStatus === 'done' ? new Date().toISOString() : null
    const updatedAt = new Date().toISOString()

    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t,
      status: nextStatus,
      completed_at: completedAt,
      updated_at: updatedAt
    } : t))

    try {
      await (supabase as any)
        .from('tasks')
        .update({ status: nextStatus, completed_at: completedAt, updated_at: updatedAt })
        .eq('id', task.id)
      toast.success(nextStatus === 'done' ? 'Task completed!' : 'Task re-opened')
    } catch (_) {}
  }

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null
    const updatedAt = new Date().toISOString()

    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status: newStatus,
      completed_at: completedAt,
      updated_at: updatedAt
    } : t))

    try {
      await (supabase as any)
        .from('tasks')
        .update({ status: newStatus, completed_at: completedAt, updated_at: updatedAt })
        .eq('id', taskId)
    } catch (_) {}
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks & Deliverables</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Sprint taskboard, technical milestones, and team assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setView('board')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'board'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="input sm:w-56"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="input sm:w-36"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Kanban Board View */}
      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map(col => {
            const colCfg = STATUS_CONFIG[col]
            const colTasks = filtered.filter(t => t.status === col)

            return (
              <div key={col} className="flex flex-col bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {colCfg.column}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No tasks in this column
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                      const proj = projectMap[task.project_id]

                      return (
                        <div
                          key={task.id}
                          className={`card p-3.5 space-y-2.5 hover:shadow-md transition-shadow cursor-pointer ${pri.border}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                              {task.title}
                            </h4>
                            <button
                              onClick={() => toggleTaskStatus(task)}
                              className="text-slate-400 hover:text-emerald-500 shrink-0"
                            >
                              <CheckCircle2 className={`w-4 h-4 ${task.status === 'done' ? 'text-emerald-500' : ''}`} />
                            </button>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                              {proj?.name ?? 'General'}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase ${pri.color}`}>
                              {pri.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {task.assigned_to?.split(' ')[0] || 'Dev'}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>

                          {/* Quick move status selector */}
                          <div className="pt-1">
                            <select
                              value={task.status}
                              onChange={e => moveTask(task.id, e.target.value as TaskStatus)}
                              className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-500 w-full cursor-pointer"
                            >
                              <option value="todo">Move to To Do</option>
                              <option value="in_progress">Move to In Progress</option>
                              <option value="review">Move to Review</option>
                              <option value="done">Move to Done</option>
                              <option value="blocked">Move to Blocked</option>
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Task Title</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
                  const proj = projectMap[task.project_id]

                  return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td>
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className="text-slate-400 hover:text-emerald-500"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${task.status === 'done' ? 'text-emerald-500' : ''}`} />
                        </button>
                      </td>
                      <td className={`font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {task.title}
                      </td>
                      <td className="text-xs text-slate-500">{proj?.name ?? '—'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold ${pri.color}`}>
                          {pri.label}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 dark:text-slate-400">{task.assigned_to ?? 'Unassigned'}</td>
                      <td className="text-xs text-slate-500">{task.due_date ? formatDate(task.due_date) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Project Task</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="form-group">
                <label className="label">Project *</label>
                <select
                  required
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="input cursor-pointer"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement payment gateway webhook & security audit"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="label">Description / Acceptance Criteria</label>
                <textarea
                  rows={3}
                  placeholder="Technical notes, dependencies, or links to Figma specs..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TaskStatus)}
                    className="input cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="input cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Assigned To</label>
                  <input
                    type="text"
                    placeholder="e.g. Full-Stack Team"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
