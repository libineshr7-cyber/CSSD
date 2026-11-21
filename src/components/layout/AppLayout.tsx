import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5] dark:bg-[#1E1E1E] text-[#1E1E1E] dark:text-[#F5F5F5]">
      {/* Figma Layers Panel Sidebar */}
      <Sidebar />

      {/* Main Canvas Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Figma Top Navigation Bar */}
        <TopNav />

        {/* Canvas Body with subtle Figma dot grid */}
        <main className="flex-1 overflow-y-auto figma-canvas-dots p-6">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
