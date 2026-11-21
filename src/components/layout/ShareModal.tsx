import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Globe, Lock, Shield, ChevronDown, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'can-edit' | 'can-view'>('can-edit')
  const [members, setMembers] = useState([
    { name: 'Libinesh R (You)', email: 'libineshr7@gmail.com', role: 'Owner', avatar: 'LR', color: 'bg-[#0D99FF]' },
    { name: 'CapeSecure Admin', email: 'admin@capesecure.co.za', role: 'Admin', avatar: 'CA', color: 'bg-[#A259FF]' },
    { name: 'Sarah Miller', email: 'sarah.m@capesecure.co.za', role: 'Can edit', avatar: 'SM', color: 'bg-[#0ACF83]' },
  ])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Figma workspace link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setMembers(prev => [
      ...prev,
      {
        name: email.split('@')[0],
        email,
        role: role === 'can-edit' ? 'Can edit' : 'Can view',
        avatar: email.slice(0, 2).toUpperCase(),
        color: 'bg-[#FF7262]'
      }
    ])
    toast.success(`Invite sent to ${email}`)
    setEmail('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl shadow-2xl p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] dark:border-[#383838]">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="CapeSecure" className="w-8 h-8 rounded-lg object-contain shadow-xs flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-[#1E1E1E] dark:text-[#F5F5F5]">
                    Share CapeSecure BMS
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Invite collaborators or copy the live workspace link
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2C] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="mt-4 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Add emails, comma separated..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-[#1E1E1E] dark:text-[#F5F5F5] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="px-2 py-2 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
              >
                <option value="can-edit">Can edit</option>
                <option value="can-view">Can view</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#0D99FF] hover:bg-[#007BE5] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            </form>

            {/* Team List */}
            <div className="mt-5 space-y-3 max-h-52 overflow-y-auto pr-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Who has access ({members.length})
              </div>
              {members.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${m.color} text-white font-semibold text-[11px] flex items-center justify-center`}>
                      {m.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-[#2C2C2C] px-2 py-1 rounded">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Public Link row & Copy Link */}
            <div className="mt-6 pt-4 border-t border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0ACF83]" />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Anyone with the link can view
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#2C2C2C] hover:bg-slate-200 dark:hover:bg-[#333333] text-[#0D99FF] text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
