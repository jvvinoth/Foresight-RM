import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Client from './pages/Client'
import Agents from './pages/Agents'
import Integrity from './pages/Integrity'

function Protected({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const signedIn = Boolean(localStorage.getItem('foresight.rm'))
  if (!signedIn) return <Navigate to="/" replace state={{ from: loc.pathname }} />
  return <Shell>{children}</Shell>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/client/:id"
        element={
          <Protected>
            <Client />
          </Protected>
        }
      />
      <Route
        path="/agents"
        element={
          <Protected>
            <Agents />
          </Protected>
        }
      />
      <Route
        path="/integrity"
        element={
          <Protected>
            <Integrity />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
