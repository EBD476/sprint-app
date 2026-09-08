import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PrefsProvider } from './store/PrefsContext'
import { SprintProvider } from './store/SprintContext'
import { PresetProvider } from './store/PresetContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <PresetProvider>
          <SprintProvider>
            <App />
          </SprintProvider>
        </PresetProvider>
      </PrefsProvider>
    </BrowserRouter>
  </React.StrictMode>
)
