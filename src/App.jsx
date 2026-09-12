import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Compare from './pages/Compare'
import Analysis from './pages/Analysis'
import Presets from './pages/Presets'
import DataSourceSelector from './pages/DataSourceSelector'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Unauthorized from './pages/Unauthorized'
import { LlmProvider } from './store/LlmContext'
import ProtectedRoute from './components/ProtectedRoute'
import SettingsModal from './components/SettingsModal'
import ColumnMappingModal from './components/ColumnMappingModal'
import { useSprint } from './store/SprintContext'

function MappingModal() {
  const { pendingMapping, cancelMapping, applyMapping } = useSprint()
  if (!pendingMapping) return null
  return <ColumnMappingModal data={pendingMapping} onCancel={cancelMapping} onApply={applyMapping} />
}

export default function App() {
  return (
    <AuthProvider>
      <LlmProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="compare" element={<ProtectedRoute permission="compare"><Compare /></ProtectedRoute>} />
            <Route path="analysis" element={<ProtectedRoute permission="analysis"><Analysis /></ProtectedRoute>} />
            <Route path="presets" element={<ProtectedRoute permission="presets"><Presets /></ProtectedRoute>} />
            <Route path="source" element={<ProtectedRoute permission="dataSource"><DataSourceSelector /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute permission="admin"><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/source" replace />} />
        </Routes>
        <SettingsModal />
        <MappingModal />
      </LlmProvider>
    </AuthProvider>
  )
}
