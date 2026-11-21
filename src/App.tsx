import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import PublicHomePage from './pages/public/PublicHomePage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminProfilePage from './pages/AdminProfilePage'
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
import UnauthorizedPage from './pages/UnauthorizedPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* ── CapeSecure Public Website ── */}
      <Route path="/" element={<PublicHomePage />} />

      {/* ── Auth Flow Routes ── */}
      <Route path="/login" element={user ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route path="/admin/login" element={user ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Protected Admin Application Area (/admin) with RBAC ── */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<OverviewPage />} />
        
        {/* Profile */}
        <Route path="profile" element={<AdminProfilePage />} />

        {/* Business Modules with RBAC */}
        <Route path="leads" element={
          <ProtectedRoute requiredModule="leads"><LeadsPage /></ProtectedRoute>
        } />
        <Route path="clients" element={
          <ProtectedRoute requiredModule="clients"><ClientsPage /></ProtectedRoute>
        } />
        <Route path="requirements" element={
          <ProtectedRoute requiredModule="requirements"><RequirementsPage /></ProtectedRoute>
        } />
        <Route path="quotations" element={
          <ProtectedRoute requiredModule="quotations"><QuotationsPage /></ProtectedRoute>
        } />
        <Route path="agreements" element={
          <ProtectedRoute requiredModule="agreements"><AgreementsPage /></ProtectedRoute>
        } />

        {/* Finance Modules with Strict Role-Based Access */}
        <Route path="payments" element={
          <ProtectedRoute requiredModule="payments"><PaymentsPage /></ProtectedRoute>
        } />
        <Route path="invoices" element={
          <ProtectedRoute requiredModule="invoices"><InvoicesPage /></ProtectedRoute>
        } />

        {/* Production & Operations Modules with RBAC */}
        <Route path="projects" element={
          <ProtectedRoute requiredModule="projects"><ProjectsPage /></ProtectedRoute>
        } />
        <Route path="tasks" element={
          <ProtectedRoute requiredModule="tasks"><TasksPage /></ProtectedRoute>
        } />
        <Route path="design-approvals" element={
          <ProtectedRoute requiredModule="design-approvals"><DesignApprovalsPage /></ProtectedRoute>
        } />
        <Route path="testing" element={
          <ProtectedRoute requiredModule="testing"><TestingPage /></ProtectedRoute>
        } />
        <Route path="deployments" element={
          <ProtectedRoute requiredModule="deployments"><DeploymentsPage /></ProtectedRoute>
        } />
        <Route path="handover" element={
          <ProtectedRoute requiredModule="handover"><HandoverPage /></ProtectedRoute>
        } />
        <Route path="maintenance" element={
          <ProtectedRoute requiredModule="maintenance"><MaintenancePage /></ProtectedRoute>
        } />
        <Route path="monitoring" element={
          <ProtectedRoute requiredModule="monitoring"><MonitoringPage /></ProtectedRoute>
        } />
        <Route path="tickets" element={
          <ProtectedRoute requiredModule="tickets"><TicketsPage /></ProtectedRoute>
        } />
        <Route path="documents" element={
          <ProtectedRoute requiredModule="documents"><DocumentsPage /></ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute requiredModule="reports"><ReportsPage /></ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute requiredModule="settings"><SettingsPage /></ProtectedRoute>
        } />
      </Route>

      {/* ── Backward-compatible Aliases ── */}
      <Route path="/leads" element={<Navigate to="/admin/leads" replace />} />
      <Route path="/clients" element={<Navigate to="/admin/clients" replace />} />
      <Route path="/requirements" element={<Navigate to="/admin/requirements" replace />} />
      <Route path="/quotations" element={<Navigate to="/admin/quotations" replace />} />
      <Route path="/agreements" element={<Navigate to="/admin/agreements" replace />} />
      <Route path="/payments" element={<Navigate to="/admin/payments" replace />} />
      <Route path="/invoices" element={<Navigate to="/admin/invoices" replace />} />
      <Route path="/projects" element={<Navigate to="/admin/projects" replace />} />
      <Route path="/tasks" element={<Navigate to="/admin/tasks" replace />} />
      <Route path="/design-approvals" element={<Navigate to="/admin/design-approvals" replace />} />
      <Route path="/testing" element={<Navigate to="/admin/testing" replace />} />
      <Route path="/deployments" element={<Navigate to="/admin/deployments" replace />} />
      <Route path="/handover" element={<Navigate to="/admin/handover" replace />} />
      <Route path="/maintenance" element={<Navigate to="/admin/maintenance" replace />} />
      <Route path="/monitoring" element={<Navigate to="/admin/monitoring" replace />} />
      <Route path="/tickets" element={<Navigate to="/admin/tickets" replace />} />
      <Route path="/documents" element={<Navigate to="/admin/documents" replace />} />
      <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
      <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#252525',
                  color: '#f5f5f5',
                  border: '1px solid #383838',
                  borderRadius: '10px',
                  fontSize: '13px',
                },
                success: {
                  iconTheme: { primary: '#0ACF83', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#F24E1E', secondary: '#fff' },
                },
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
