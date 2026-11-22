import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, ArrowLeft, CheckCircle2, Shield, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your administrator email.')

    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      setSubmitted(true)
      toast.success('Password reset instructions sent to your email.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1E1E1E] figma-canvas-dots flex flex-col items-center justify-center p-4 relative select-none">
      
      {/* Top Bar Link */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#0D99FF] shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm z-10"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <Shield className="w-7 h-7 text-[#0D99FF]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Reset Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs">
            Enter your CapeSecure admin email address to receive secure recovery credentials.
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xl space-y-4">
          {submitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-[#0ACF83]/15 text-[#0ACF83] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Email Dispatched</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  We sent a recovery link to <strong className="text-slate-700 dark:text-slate-200">{email}</strong>. Please check your inbox and follow the secure link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#0D99FF] hover:underline block mx-auto pt-2"
              >
                Send again to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@capesecure.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0D99FF] hover:bg-[#007BE5] disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Dispatching reset link...</span>
                ) : (
                  <span>Send Recovery Instructions</span>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-400 text-[11px] mt-6">
          CapeSecure Security · TLS 1.3 End-to-End Encrypted
        </p>
      </motion.div>
    </div>
  )
}
