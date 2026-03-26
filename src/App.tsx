import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AdminLayout } from './components/AdminLayout'
import { AdminProvider, useAdminContext } from './context/AdminContext'
import { DashboardPage } from './pages/DashboardPage'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { LivePage } from './pages/LivePage'
import { MembersPage } from './pages/MembersPage'
import { PostsPage } from './pages/PostsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SpaceSettingsPage } from './pages/SpaceSettingsPage'
import { WhispersPage } from './pages/WhispersPage'
import { SystemAdminLayout } from './systemAdmin/components/SystemAdminLayout'
import { SystemAdminProvider, useSystemAdminContext } from './systemAdmin/context/SystemAdminContext'
import { SystemAuditPage } from './systemAdmin/pages/SystemAuditPage'
import { SystemDashboardPage } from './systemAdmin/pages/SystemDashboardPage'
import { SystemLivePage } from './systemAdmin/pages/SystemLivePage'
import { SystemLoginPage } from './systemAdmin/pages/SystemLoginPage'
import { SystemPostsPage } from './systemAdmin/pages/SystemPostsPage'
import { SystemReportsPage } from './systemAdmin/pages/SystemReportsPage'
import { SystemSpacesPage } from './systemAdmin/pages/SystemSpacesPage'
import { SystemUsersPage } from './systemAdmin/pages/SystemUsersPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/system-admin/*" element={<SystemAdminRoot />} />
        <Route path="/*" element={<OwnerAdminRoot />} />
      </Routes>
    </BrowserRouter>
  )
}

function OwnerAdminRoot() {
  return (
    <AdminProvider>
      <OwnerAdminRoutes />
    </AdminProvider>
  )
}

function OwnerAdminRoutes() {
  const { ready, authenticated } = useAdminContext()

  if (!ready) {
    return <main className="page-empty">管理画面を起動しています...</main>
  }

  return (
    <Routes>
      {!authenticated ? (
        <>
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="space-settings" element={<SpaceSettingsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="whispers" element={<WhispersPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="login" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      )}
    </Routes>
  )
}

function SystemAdminRoot() {
  return (
    <SystemAdminProvider>
      <SystemAdminRoutes />
    </SystemAdminProvider>
  )
}

function SystemAdminRoutes() {
  const { ready, authenticated } = useSystemAdminContext()

  if (!ready) {
    return <main className="page-empty">システム管理画面を起動しています...</main>
  }

  return (
    <Routes>
      {!authenticated ? (
        <>
          <Route path="login" element={<SystemLoginPage />} />
          <Route path="*" element={<Navigate to="/system-admin/login" replace />} />
        </>
      ) : (
        <>
          <Route element={<SystemAdminLayout />}>
            <Route index element={<Navigate to="/system-admin/dashboard" replace />} />
            <Route path="dashboard" element={<SystemDashboardPage />} />
            <Route path="spaces" element={<SystemSpacesPage />} />
            <Route path="posts" element={<SystemPostsPage />} />
            <Route path="live" element={<SystemLivePage />} />
            <Route path="users" element={<SystemUsersPage />} />
            <Route path="reports" element={<SystemReportsPage />} />
            <Route path="audit" element={<SystemAuditPage />} />
          </Route>
          <Route path="login" element={<Navigate to="/system-admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/system-admin/dashboard" replace />} />
        </>
      )}
    </Routes>
  )
}

export default App
