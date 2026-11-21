import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import LeadsPage from './pages/LeadsPage'
import ClientsPage from './pages/ClientsPage'
import RequirementsPage from './pages/RequirementsPage'
import QuotationsPage from './pages/QuotationsPage'
import AgreementsPage from './pages/AgreementsPage'
import PaymentsPage from './pages/PaymentsPage'
import InvoicesPage from './pages/InvoicesPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import DesignApprovalsPage from './pages/DesignApprovalsPage'
import TestingPage from './pages/TestingPage'
import DeploymentsPage from './pages/DeploymentsPage'
import HandoverPage from './pages/HandoverPage'
import MaintenancePage from './pages/MaintenancePage'
import MonitoringPage from './pages/MonitoringPage'
import TicketsPage from './pages/TicketsPage'
import DocumentsPage from './pages/DocumentsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading CapeSecure BMS...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<OverviewPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="requirements" element={<RequirementsPage />} />
        <Route path="quotations" element={<QuotationsPage />} />
        <Route path="agreements" element={<AgreementsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="design-approvals" element={<DesignApprovalsPage />} />
        <Route path="testing" element={<TestingPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="handover" element={<HandoverPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
