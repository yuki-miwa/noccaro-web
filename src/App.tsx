import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AdminLayout } from './components/AdminLayout'
import { AdminProvider } from './context/AdminContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MembersPage } from './pages/MembersPage'
import { PostsPage } from './pages/PostsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SpaceSettingsPage } from './pages/SpaceSettingsPage'
import { WhispersPage } from './pages/WhispersPage'
import { useAdminContext } from './context/AdminContext'

function App() {
  return (
    <AdminProvider>
      <AppRoutes />
    </AdminProvider>
  )
}

function AppRoutes() {
  const { ready, authenticated } = useAdminContext()

  if (!ready) {
    return <main className="page-empty">管理画面を起動しています...</main>
  }

  return (
    <BrowserRouter>
      <Routes>
        {!authenticated ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/space-settings" element={<SpaceSettingsPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/whispers" element={<WhispersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
