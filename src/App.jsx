import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Compare from './pages/Compare'
import Analysis from './pages/Analysis'
import Presets from './pages/Presets'
import DataSourceSelector from './pages/DataSourceSelector'
import { LlmProvider } from './store/LlmContext'
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
    <LlmProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="compare" element={<Compare />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="presets" element={<Presets />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/source" element={<DataSourceSelector />} />
        <Route path="*" element={<Navigate to="/source" replace />} />
      </Routes>
      <SettingsModal />
      <MappingModal />
    </LlmProvider>
  )
}
