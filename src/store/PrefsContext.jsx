import { createContext, useContext, useEffect, useState } from 'react'

const PrefsContext = createContext(null)

const THEME_KEY = 'sprint-pulse-theme'
const LOCALE_KEY = 'sprint-pulse-locale'
const PANELS_KEY = 'sprint-pulse-panels'
const WINDOW_STYLE_KEY = 'sprint-pulse-window-style'

export const PANEL_IDS = [
  'standup',
  'sankey',
  'network',
  'burndown',
  'velocity',
  'flow',
  'capacity',
  'report',
  'status',
  'assignee',
  'sprintProgress',
  'cycleTimes',
  'tasks',
]

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v || fallback
  } catch {
    return fallback
  }
}

function loadPanels() {
  const fallback = Object.fromEntries(PANEL_IDS.map((id) => [id, true]))
  try {
    const raw = localStorage.getItem(PANELS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed }
      }
    }
  } catch {
    // persistence best-effort only
  }
  return fallback
}

export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(() => load(THEME_KEY, 'dark'))
  const [locale, setLocale] = useState(() => load(LOCALE_KEY, 'en'))
  const [windowStyle, setWindowStyle] = useState(() => load(WINDOW_STYLE_KEY, 'soft'))
  const [panels, setPanels] = useState(loadPanels)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('appearance')

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // persistence best-effort only
    }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('lang', locale)
    root.setAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr')
    try {
      localStorage.setItem(LOCALE_KEY, locale)
    } catch {
      // persistence best-effort only
    }
  }, [locale])

  useEffect(() => {
    try {
      localStorage.setItem(WINDOW_STYLE_KEY, windowStyle)
    } catch {
      // persistence best-effort only
    }
  }, [windowStyle])

  const togglePanel = (id) => {
    setPanels((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(PANELS_KEY, JSON.stringify(next))
      } catch {
        // persistence best-effort only
      }
      return next
    })
  }

  const resetPanels = () => {
    const next = Object.fromEntries(PANEL_IDS.map((id) => [id, true]))
    setPanels(next)
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(next))
    } catch {
      // persistence best-effort only
    }
  }

  const openSettings = (tab = 'appearance') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }
  const closeSettings = () => setSettingsOpen(false)

  const value = {
    theme,
    locale,
    windowStyle,
    setWindowStyle,
    panels,
    setTheme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setLocale,
    togglePanel,
    resetPanels,
    settingsOpen,
    settingsTab,
    setSettingsTab,
    openSettings,
    closeSettings,
  }

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
