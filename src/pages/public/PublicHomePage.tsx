import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Lock, Server, Cpu, CheckCircle2, ArrowRight,
  ExternalLink, Mail, Phone, MapPin, ChevronRight, Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { demoLeads } from '../../data/demoData'

export default function PublicHomePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      toast.error('Please provide your name and work email.')
      return
    }
    // Record into leads
    demoLeads.unshift({
      id: `lead-web-${Date.now()}`,
      name,
      email,
      company: company || 'Self-Employed / SME',
      phone: null,
      status: 'new',
      source: 'website',
      budget: 15000,
      notes: message || 'Inquiry submitted from public website homepage.',
      assigned_to: 'CapeSecure Team',
      next_follow_up: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    setSubmitted(true)
    toast.success('Thank you! A CapeSecure security advisor will contact you shortly.')
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#181818] text-slate-900 dark:text-[#F5F5F5] selection:bg-[#0D99FF]/20 selection:text-[#0D99FF]">
      
      {/* ── Public Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#202020]/80 backdrop-blur-md border-b border-[#E5E5E5] dark:border-[#333333]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CapeSecure" className="w-10 h-10 rounded-xl object-contain drop-shadow-md flex-shrink-0" />
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                CapeSecure
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Security & Infrastructure Systems
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#services" className="hover:text-[#0D99FF] transition-colors">Services</a>
            <a href="#solutions" className="hover:text-[#0D99FF] transition-colors">Solutions</a>
            <a href="#about" className="hover:text-[#0D99FF] transition-colors">About Us</a>
            <a href="#contact" className="hover:text-[#0D99FF] transition-colors">Get a Quote</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0D99FF] hover:bg-[#007BE5] text-white shadow-xs transition-all"
            >
              <span>Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-16 pb-24 px-6 figma-canvas-dots overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-2"
          >
            <img
              src="/logo.png"
              alt="CapeSecure Official Logo"
              className="w-32 h-32 sm:w-44 sm:h-44 rounded-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#383838] shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <span className="w-2 h-2 rounded-full bg-[#0ACF83] animate-pulse" />
            Next-Gen Security & Operations for Modern Enterprise
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight"
          >
            Uncompromising Digital Defense & Infrastructure Management
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            CapeSecure empowers businesses across Southern Africa with enterprise-grade cybersecurity, rapid systems deployment, continuous monitoring, and structured SLA lifecycle management.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <a
              href="#contact"
              className="px-6 py-3 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#0D99FF]/25 transition-all flex items-center gap-2"
            >
              <span>Request Consultation</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/admin"
              className="px-6 py-3 bg-white dark:bg-[#2C2C2C] hover:bg-slate-50 dark:hover:bg-[#383838] border border-[#E5E5E5] dark:border-[#383838] text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-[#0D99FF]" />
              <span>Staff Login</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className="py-20 px-6 max-w-7xl mx-auto border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#0D99FF] uppercase tracking-wider">Enterprise Services</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2 text-slate-900 dark:text-white">
            End-to-End Protection & Engineering
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Engineered for high reliability, strict data compliance, and 99.99% uptime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#0D99FF]/10 text-[#0D99FF] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Threat Defense & Auditing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Vulnerability assessment, penetration testing, firewall policy management, and automated incident prevention.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> ISO 27001 Alignment</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> Automated Log Auditing</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#A259FF]/10 text-[#A259FF] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Cloud & Web Engineering</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Scalable cloud instances, high-availability web applications, and automated CI/CD pipeline deployments.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> Production CI/CD</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> Zero-Downtime Releases</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#0ACF83]/10 text-[#0ACF83] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">24/7 SLA & Monitoring</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Proactive uptime pings, automated SSL certificate renewals, and rapid-response on-call engineering.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> Sub-Minute Health Alerts</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83]" /> Guaranteed Resolution SLAs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Contact / Lead Capture Form ── */}
      <section id="contact" className="py-20 px-6 bg-white dark:bg-[#202020] border-t border-[#E5E5E5] dark:border-[#333333]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold text-[#0D99FF] uppercase tracking-wider">Get in Touch</span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2 text-slate-900 dark:text-white">
              Request a Systems Audit or Consultation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-3 leading-relaxed">
              Let us analyze your infrastructure, harden your security posture, and provide a tailored proposal for your business.
            </p>

            <div className="space-y-3 mt-8 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#0D99FF]" />
                <span>admin@capesecure.co.za</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#0D99FF]" />
                <span>Cape Town, Western Cape, South Africa</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#0ACF83]/10 text-[#0ACF83] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Inquiry Received</h3>
                <p className="text-xs text-slate-500">
                  We have registered your request in our BMS pipeline. One of our engineers will follow up within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 bg-[#0D99FF] text-white text-xs font-semibold rounded-lg"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 bg-white dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@company.co.za"
                    className="w-full px-3 py-2 bg-white dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Acme Enterprises"
                    className="w-full px-3 py-2 bg-white dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Details / Requirements</label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your security, development, or hosting needs..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 bg-slate-100 dark:bg-[#181818] border-t border-[#E5E5E5] dark:border-[#2C2C2C] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CapeSecure" className="w-6 h-6 rounded-md object-contain" />
            <span>&copy; {new Date().getFullYear()} CapeSecure Technologies. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-[#0D99FF] hover:underline font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Staff Admin Portal
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
