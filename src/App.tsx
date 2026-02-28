import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AdminLayout } from './components/AdminLayout'
import { AdminProvider } from './context/AdminContext'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SpaceSettingsPage } from './pages/SpaceSettingsPage'

function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/space-settings" element={<SpaceSettingsPage />} />
            <Route
              path="/members"
              element={
                <PlaceholderPage
                  title="Members"
                  description="Membership moderation actions will be implemented in this workspace in the next step."
                />
              }
            />
            <Route
              path="/posts"
              element={
                <PlaceholderPage
                  title="Posts"
                  description="Owner article list and publish controls will be implemented in the next step."
                />
              }
            />
            <Route
              path="/whispers"
              element={
                <PlaceholderPage
                  title="Whispers"
                  description="Whisper moderation and visibility controls will be implemented in the next step."
                />
              }
            />
            <Route
              path="/reports"
              element={
                <PlaceholderPage
                  title="Reports"
                  description="Report triage and resolution actions will be implemented in the next step."
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  )
}

export default App
