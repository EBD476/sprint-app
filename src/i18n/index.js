import { usePrefs } from '../store/PrefsContext'
import { translations } from './translations'

const numberFmt = {
  en: new Intl.NumberFormat('en-US'),
  fa: new Intl.NumberFormat('fa-IR'),
}

export function useI18n() {
  const { locale, setLocale } = usePrefs()
  const dict = translations[locale] || translations.en

  const t = (key, vars) => {
    let str = dict[key] ?? translations.en[key] ?? key
    if (!vars) return str
    const entries = Object.entries(vars)
    const regex = new RegExp(`\\{(${entries.map(([k]) => k).join('|')})\\}`, 'g')
    const parts = String(str).split(regex)
    const result = []
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) result.push(parts[i])
      } else {
        result.push(vars[parts[i]])
      }
    }
    return result.length === 1 ? result[0] : result
  }

  const n = (value) => {
    if (value == null) return ''
    return numberFmt[locale]?.format(value) ?? numberFmt.en.format(value)
  }

  const pct = (value) => (locale === 'fa' ? `${n(value)}٪` : `${n(value)}%`)

  return { locale, setLocale, t, n, pct, dir: locale === 'fa' ? 'rtl' : 'ltr' }
}
