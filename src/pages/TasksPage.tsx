import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, CheckSquare, Clock, AlertCircle, Calendar,
  User, Tag, CheckCircle2, LayoutGrid, List, Filter, RefreshCw,
  MessageSquare, Paperclip, Check, X, ArrowRight, ExternalLink,
  Send, Trash2, FileText, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskComment,
  TaskAttachment,
  Project
} from '../types/database'

const STATUS_CONFIG: Record<TaskStatus, { label: string; badge: string; column: string }> = {
  todo:        { label: 'To Do',       badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', column: 'To Do' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',     column: 'In Progress' },
  review:      { label: 'Review',      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', column: 'In Review' },
  done:        { label: 'Done',        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', column: 'Completed' },
  blocked:     { label: 'Blocked',     badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',       column: 'Blocked' },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string; badge: string }> = {
  urgent: { label: 'Urgent', color: 'text-rose-400',   border: 'border-l-4 border-l-rose-500',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  high:   { label: 'High',   color: 'text-amber-400',  border: 'border-l-4 border-l-amber-500',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  medium: { label: 'Medium', color: 'text-blue-400',   border: 'border-l-4 border-l-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  low:    { label: 'Low',    color: 'text-slate-400',  border: 'border-l-4 border-l-slate-400',  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked']

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Form states for creation
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignedTo, setAssignedTo] = useState('Senior Full-Stack Engineer')
  const [dueDate, setDueDate] = useState('')
  const [progress, setProgress] = useState<number>(0)
  const [tagsInput, setTagsInput] = useState('feature, backend')

  // Comment & Attachment inputs inside Task Detail Modal
  const [commentText, setCommentText] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

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
      const proj = projectMap[t.project_id]
      const matchSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (t.assigned_to?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (proj?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchProj = projectFilter === 'all' || t.project_id === projectFilter
      const matchPri = priorityFilter === 'all' || t.priority === priorityFilter
      return matchSearch && matchProj && matchPri
    })
  }, [tasks, search, projectFilter, priorityFilter, projectMap])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Task title is required')
      return
    }

    const nowIso = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)

    const newTaskData: Partial<Task> = {
      project_id: projectId || (projects[0]?.id ?? 'proj-default'),
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigned_to: assignedTo.trim() || 'CapeSecure Dev Team',
      due_date: dueDate || null,
      completed_at: status === 'done' ? nowIso : null,
      completed_by: status === 'done' ? currentUserEmail : null,
      progress: status === 'done' ? 100 : progress,
      comments: [],
      attachments: [],
      tags,
      created_at: nowIso,
      updated_at: nowIso,
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
      resetForm()
      toast.success('Task created successfully!')
    } catch (err) {
      toast.error('Failed to create task')
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setProgress(0)
    setStatus('todo')
    setPriority('medium')
    setDueDate('')
  }

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const nowIso = new Date().toISOString()
    const completedAt = nextStatus === 'done' ? nowIso : null
    const completedBy = nextStatus === 'done' ? (user?.email || 'Authorized Administrator') : null
    const newProgress = nextStatus === 'done' ? 100 : 50

    const updates = {
      status: nextStatus,
      completed_at: completedAt,
      completed_by: completedBy,
      progress: newProgress,
      updated_at: nowIso
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t))
    if (selectedTask?.id === task.id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
    }

    try {
      await (supabase as any).from('tasks').update(updates).eq('id', task.id)
      toast.success(nextStatus === 'done' ? 'Task marked as Completed!' : 'Task re-opened')
    } catch (_) {}
  }

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const nowIso = new Date().toISOString()
    const completedAt = newStatus === 'done' ? nowIso : null
    const completedBy = newStatus === 'done' ? (user?.email || 'Authorized Administrator') : null
    const newProgress = newStatus === 'done' ? 100 : (newStatus === 'in_progress' ? 50 : (newStatus === 'review' ? 85 : 0))

    const updates = {
      status: newStatus,
      completed_at: completedAt,
      completed_by: completedBy,
      progress: newProgress,
      updated_at: nowIso
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
    }

    try {
      await (supabase as any).from('tasks').update(updates).eq('id', taskId)
    } catch (_) {}
  }

  // Add Comment to Selected Task
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !commentText.trim()) return

    const newComment: TaskComment = {
      id: `cmt-${Date.now()}`,
      user: user?.email || 'Team Member',
      text: commentText.trim(),
      created_at: new Date().toISOString()
    }

    const updatedComments = [...(selectedTask.comments || []), newComment]
    const updates = { comments: updatedComments, updated_at: new Date().toISOString() }

    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t))
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
    setCommentText('')

    try {
      await (supabase as any).from('tasks').update(updates).eq('id', selectedTask.id)
      toast.success('Comment added to task!')
    } catch (_) {}
  }

  // Add Attachment to Selected Task
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !attachmentName.trim() || !attachmentUrl.trim()) return

    const newAtt: TaskAttachment = {
      id: `att-${Date.now()}`,
      name: attachmentName.trim(),
      url: attachmentUrl.trim(),
      size: 1024 * 128,
      uploaded_at: new Date().toISOString()
    }

    const updatedAttachments = [...(selectedTask.attachments || []), newAtt]
    const updates = { attachments: updatedAttachments, updated_at: new Date().toISOString() }

    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t))
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
    setAttachmentName('')
    setAttachmentUrl('')

    try {
      await (supabase as any).from('tasks').update(updates).eq('id', selectedTask.id)
      toast.success('Attachment linked to task!')
    } catch (_) {}
  }

  // Update Task Progress in Real-time
  const handleUpdateProgress = async (val: number) => {
    if (!selectedTask) return
    const updates = {
      progress: val,
      status: val === 100 ? ('done' as TaskStatus) : (val > 0 && selectedTask.status === 'todo' ? ('in_progress' as TaskStatus) : selectedTask.status),
      completed_at: val === 100 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t))
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null)

    try {
      await (supabase as any).from('tasks').update(updates).eq('id', selectedTask.id)
    } catch (_) {}
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-400" />
            Task Management &amp; Deliverables
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Assign team members, set priorities &amp; deadlines, track progress, and collaborate with comments &amp; attachments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setView('board')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'board' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title, details, assignee, or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* ─── KANBAN BOARD VIEW ──────────────────────────────────────────────── */}
      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colCfg = STATUS_CONFIG[col]
            const colTasks = filtered.filter(t => t.status === col)

            return (
              <div key={col} className="flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 min-w-[240px] space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
                  <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                    {colCfg.column}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 italic">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                      const proj = projectMap[task.project_id]
                      const commentsCount = task.comments?.length || 0
                      const attCount = task.attachments?.length || 0

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 space-y-2.5 rounded-xl cursor-pointer transition-all shadow-md ${pri.border}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                              {task.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTaskStatus(task)
                              }}
                              className="text-slate-400 hover:text-emerald-400 shrink-0"
                              title={task.status === 'done' ? 'Re-open task' : 'Mark completed'}
                            >
                              <CheckCircle2 className={`w-4 h-4 ${task.status === 'done' ? 'text-emerald-400' : ''}`} />
                            </button>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 truncate max-w-[130px] border border-slate-700">
                              {proj?.name ?? 'General'}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pri.badge}`}>
                              {pri.label}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                              <span>Progress</span>
                              <span>{task.progress ?? (task.status === 'done' ? 100 : 0)}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${task.progress ?? (task.status === 'done' ? 100 : 0)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[90px]">{task.assigned_to?.split(' ')[0] || 'Dev'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {commentsCount > 0 && (
                                <span className="flex items-center gap-0.5 text-blue-400">
                                  <MessageSquare className="w-3 h-3" /> {commentsCount}
                                </span>
                              )}
                              {attCount > 0 && (
                                <span className="flex items-center gap-0.5 text-purple-400">
                                  <Paperclip className="w-3 h-3" /> {attCount}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Move stage selector */}
                          <div className="pt-1" onClick={e => e.stopPropagation()}>
                            <select
                              value={task.status}
                              onChange={e => moveTask(task.id, e.target.value as TaskStatus)}
                              className="text-[11px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 w-full cursor-pointer focus:outline-none"
                            >
                              <option value="todo">Move to To Do</option>
                              <option value="in_progress">Move to In Progress</option>
                              <option value="review">Move to In Review</option>
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
        /* ─── TABLE VIEW ──────────────────────────────────────────────────── */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="w-10 px-3 py-3"></th>
                  <th className="text-left px-4 py-3">Task Title</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Progress</th>
                  <th className="text-left px-4 py-3">Assignee</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(task => {
                  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
                  const proj = projectMap[task.project_id]

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className="text-slate-400 hover:text-emerald-400"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${task.status === 'done' ? 'text-emerald-400' : ''}`} />
                        </button>
                      </td>
                      <td className={`px-4 py-3 font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                        {task.comments && task.comments.length > 0 && (
                          <span className="inline-flex items-center gap-1 ml-2 text-xs text-blue-400">
                            <MessageSquare className="w-3 h-3" /> {task.comments.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{proj?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pri.badge}`}>
                          {pri.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${task.progress ?? (task.status === 'done' ? 100 : 0)}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-400">{task.progress ?? (task.status === 'done' ? 100 : 0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{task.assigned_to ?? 'Unassigned'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{task.due_date ? formatDate(task.due_date) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TASK DETAIL & COLLABORATION MODAL ──────────────────────────────── */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${(STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.todo).badge}`}>
                    {(STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.todo).label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${(PRIORITY_CONFIG[selectedTask.priority] || PRIORITY_CONFIG.medium).badge}`}>
                    {(PRIORITY_CONFIG[selectedTask.priority] || PRIORITY_CONFIG.medium).label} Priority
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mt-1.5">{selectedTask.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Project: <strong className="text-slate-200">{projectMap[selectedTask.project_id]?.name || 'General'}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-200 p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-sm text-slate-300">
              {selectedTask.description || 'No detailed specifications provided for this task.'}
            </div>

            {/* Task Progress & Status Sliders */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Task Progress</span>
                  <span className="font-bold text-blue-400">{selectedTask.progress ?? 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedTask.progress ?? 0}
                  onChange={e => handleUpdateProgress(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Assigned Team Member</span>
                <span className="text-sm font-semibold text-slate-200">{selectedTask.assigned_to || 'CapeSecure Dev Team'}</span>
                {selectedTask.completed_at && (
                  <span className="text-[11px] text-emerald-400 block mt-0.5">
                    Completed on {formatDate(selectedTask.completed_at)} by {selectedTask.completed_by || 'Admin'}
                  </span>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-400" /> Collaboration &amp; Comments
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">No comments posted yet.</p>
                ) : (
                  selectedTask.comments.map(c => (
                    <div key={c.id} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-slate-300">{c.user}</span>
                        <span className="text-slate-500 font-mono">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-slate-200">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment or status update..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-purple-400" /> Attached Files &amp; Resources
              </h4>
              <div className="flex flex-wrap gap-2">
                {(!selectedTask.attachments || selectedTask.attachments.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">No files attached to this task.</p>
                ) : (
                  selectedTask.attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{att.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ))
                )}
              </div>

              <form onSubmit={handleAddAttachment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="File name / title"
                  value={attachmentName}
                  onChange={e => setAttachmentName(e.target.value)}
                  className="w-1/3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="url"
                  placeholder="https://... or Figma/Docs link"
                  value={attachmentUrl}
                  onChange={e => setAttachmentUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Paperclip className="w-3.5 h-3.5" /> Attach
                </button>
              </form>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => toggleTaskStatus(selectedTask)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  selectedTask.status === 'done'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {selectedTask.status === 'done' ? 'Re-open Task' : 'Record Task Completion'}
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE TASK MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100">Create Task</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Project *</label>
                <select
                  required
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement payment gateway webhook & security audit"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Technical scope, acceptance criteria, or testing notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Initial Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Assignee</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Architect / Dev"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. backend, security, api"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
