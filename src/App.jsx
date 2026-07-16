import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegistrationPage from './pages/RegistrationPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import LeadsPage from './pages/LeadsPage'
import BookingsPage from './pages/BookingsPage'
import CommissionsPage from './pages/CommissionsPage'
import HelpPage from './pages/HelpPage'
import PortalLayout from './layouts/PortalLayout'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PortalLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/commissions" element={<CommissionsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
