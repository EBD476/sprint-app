import { createContext, useContext, useEffect, useState } from 'react'
import { usePrefs } from './PrefsContext'

const LS_KEY = 'sprint-pulse-presets'

const DEFAULTS = {
  en: [
    { title: 'Sprint summary', prompt: 'Give a summary of how this sprint went.' },
    { title: 'Risks & blockers', prompt: 'What are the biggest risks or blockers?' },
    { title: 'Capacity check', prompt: 'Who is overloaded and who has capacity?' },
    { title: 'Cycle time', prompt: 'Which tasks took too long (cycle time analysis)?' },
    {
      title: 'Comment analysis',
      prompt: 'Analyze the task comments: what blockers, concerns, or signals are mentioned by the team?',
    },
    { title: 'Next sprint focus', prompt: 'What should the team focus on next sprint?' },
    { title: 'Anomalies', prompt: 'Find anomalies and inconsistencies in the data.' },
  ],
  fa: [
    { title: 'خلاصه اسپرینت', prompt: 'خلاصه‌ای از روند این اسپرینت بده.' },
    { title: 'ریسک‌ها و انسدادها', prompt: 'بزرگ‌ترین ریسک‌ها یا انسدادها چیست؟' },
    { title: 'بررسی ظرفیت', prompt: 'چه کسی اضافه‌بار است و چه کسی ظرفیت دارد؟' },
    { title: 'زمان چرخه', prompt: 'کدام تسک‌ها بیش از حد طول کشیدند (تحلیل زمان چرخه)؟' },
    {
      title: 'تحلیل کامنت‌ها',
      prompt:
        'توضیحات و کامنت‌های تسک‌ها را تحلیل کن: چه انسدادها، نگرانی‌ها یا نشانه‌هایی توسط تیم ذکر شده؟',
    },
    { title: 'تمرکز اسپرینت بعد', prompt: 'تیم در اسپرینت بعدی باید روی چه چیزی تمرکز کند؟' },
    { title: 'ناهنجاری‌ها', prompt: 'ناهنجاری‌ها و ناسازگاری‌های داده را پیدا کن.' },
  ],
}

const PresetContext = createContext(null)

let counter = 0
function uid() {
  counter += 1
  return `p-${Date.now().toString(36)}-${counter.toString(36)}`
}

function defaultPresets(locale) {
  return (DEFAULTS[locale] || DEFAULTS.en).map((p) => ({ id: uid(), ...p }))
}

function loadPresets(locale) {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // persistence best-effort only
  }
  return defaultPresets(locale)
}

export function PresetProvider({ children }) {
  const { locale } = usePrefs()
  const [presets, setPresets] = useState(() => loadPresets(locale))

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(presets))
    } catch {
      // persistence best-effort only
    }
  }, [presets])

  const addPreset = (title, prompt) =>
    setPresets((prev) => [...prev, { id: uid(), title: title.trim(), prompt: prompt.trim() }])

  const updatePreset = (id, title, prompt) =>
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: title.trim(), prompt: prompt.trim() } : p))
    )

  const deletePreset = (id) => setPresets((prev) => prev.filter((p) => p.id !== id))

  const resetPresets = () => setPresets(defaultPresets(locale))

  const value = { presets, addPreset, updatePreset, deletePreset, resetPresets }

  return <PresetContext.Provider value={value}>{children}</PresetContext.Provider>
}

export function usePresets() {
  const ctx = useContext(PresetContext)
  if (!ctx) throw new Error('usePresets must be used within PresetProvider')
  return ctx
}