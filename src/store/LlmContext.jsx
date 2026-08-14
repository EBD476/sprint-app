import { createContext, useContext, useMemo, useState } from 'react'

const LS_KEY = 'sprint-llm-settings'
const DEFAULT_SETTINGS = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  mode: 'direct',
  proxyUrl: 'http://localhost:8787/v1/chat/completions',
  proxyToken: '',
}

const LlmContext = createContext(null)

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function LlmProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  const value = useMemo(
    () => ({
      ...settings,
      saveSettings: (next) => {
        const merged = { ...DEFAULT_SETTINGS, ...settings, ...next }
        setSettings(merged)
        localStorage.setItem(LS_KEY, JSON.stringify(merged))
      },
    }),
    [settings]
  )

  return <LlmContext.Provider value={value}>{children}</LlmContext.Provider>
}

export function useLlm() {
  const ctx = useContext(LlmContext)
  if (!ctx) throw new Error('useLlm must be used within LlmProvider')
  return ctx
}
