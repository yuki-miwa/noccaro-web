import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AdminLayout } from './components/AdminLayout'
import { AdminProvider } from './context/AdminContext'
import { DashboardPage } from './pages/DashboardPage'
import { MembersPage } from './pages/MembersPage'
import { PostsPage } from './pages/PostsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SpaceSettingsPage } from './pages/SpaceSettingsPage'
import { WhispersPage } from './pages/WhispersPage'

function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/space-settings" element={<SpaceSettingsPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/whispers" element={<WhispersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  )
}

export default App
