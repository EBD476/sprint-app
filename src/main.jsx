import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PrefsProvider } from './store/PrefsContext'
import { SprintProvider } from './store/SprintContext'
import { PresetProvider } from './store/PresetContext'
import { ToastProvider } from './store/ToastContext'
import { useI18n } from './i18n'
import './index.css'

function ToastProviderWrapper({ children }) {
  const { t } = useI18n()
  return <ToastProvider translate={t}>{children}</ToastProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <ToastProviderWrapper>
          <PresetProvider>
            <SprintProvider>
              <App />
            </SprintProvider>
          </PresetProvider>
        </ToastProviderWrapper>
      </PrefsProvider>
    </BrowserRouter>
  </React.StrictMode>
)
