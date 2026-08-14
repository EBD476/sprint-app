import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PrefsProvider } from './store/PrefsContext'
import { SprintProvider } from './store/SprintContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <SprintProvider>
          <App />
        </SprintProvider>
      </PrefsProvider>
    </BrowserRouter>
  </React.StrictMode>
)
