import { useSprint } from '../store/SprintContext'
import { usePrefs } from '../store/PrefsContext'
import { useI18n } from '../i18n'
import { dataRange, activeSprintRange, lastSprintsRange, currentQuarterRange } from '../utils/window'
import JalaliDatePicker from './JalaliDatePicker'

function CalendarIcon() {
  return (
    <svg
      className="window-label-icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function WindowBar() {
  const { csvMeta, allTasks, tasks, window, setWindow, resetWindow } = useSprint()
  const { windowStyle } = usePrefs()
  const { t, n, locale } = useI18n()

  if (!csvMeta) return null

  const range = dataRange(allTasks)
  const defaultRange = activeSprintRange(allTasks)
  const filteredCount = tasks ? tasks.length : 0
  const totalCount = allTasks ? allTasks.length : 0
  const active = !!(window.start || window.end)

  const presetRanges = {
    current: activeSprintRange(allTasks),
    last2: lastSprintsRange(allTasks, 2),
    quarter: currentQuarterRange(),
  }
  const presets = [
    { key: 'current', label: t('window.presetCurrent') },
    { key: 'last2', label: t('window.presetLast2') },
    { key: 'quarter', label: t('window.presetQuarter') },
    { key: 'all', label: t('window.presetAll') },
  ]
  const presetActive = (key) => {
    if (key === 'all') return !active
    const r = presetRanges[key]
    return !!r && window.start === r.start && window.end === r.end
  }
  const applyPreset = (key) => {
    if (key === 'all') return resetWindow()
    const r = presetRanges[key]
    if (r) setWindow({ start: r.start, end: r.end })
  }

  const dateField = (field, labelKey) => {
    const iso = window[field] ?? defaultRange?.[field]
    const update = (val) => setWindow({ ...window, [field]: val })
    if (locale === 'fa') {
      return (
        <JalaliDatePicker
          value={iso}
          onChange={update}
          min={range.min || undefined}
          max={range.max || undefined}
          ariaLabel={t(labelKey)}
          placeholder={t(labelKey)}
        />
      )
    }
    return (
      <input
        type="date"
        className="window-input"
        aria-label={t(labelKey)}
        min={range.min || undefined}
        max={range.max || undefined}
        value={iso || ''}
        onChange={(e) => update(e.target.value || null)}
      />
    )
  }

  const fmtDate = (d) => {
    if (!d) return t('window.all')
    try {
      return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(d + 'T00:00:00'))
    } catch {
      return d
    }
  }

  return (
    <div className={`window-bar window-bar--${windowStyle}${active ? ' active' : ''}`}>
      <div className="window-fields">
        <span className="window-label" title={t('window.hint')}>
          <CalendarIcon />
          {t('window.title')}
        </span>
        <div className="window-range">
          {dateField('start', 'window.start')}
          <span className="window-sep" aria-hidden="true">
            →
          </span>
          {dateField('end', 'window.end')}
        </div>
        {active && (
          <button className="btn ghost window-reset" onClick={resetWindow}>
            {t('window.reset')}
          </button>
        )}
        <div className="window-presets" role="group" aria-label={t('window.presets')}>
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`window-preset${presetActive(p.key) ? ' active' : ''}`}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="window-meta">
        <span className="muted small">
          {active
            ? `${fmtDate(window.start)} – ${fmtDate(window.end)}`
            : t('window.all')}
        </span>
        <span className={`window-count${filteredCount === 0 ? ' empty' : ''}`}>
          {n(filteredCount)} / {n(totalCount)} {t('common.tasks')}
        </span>
      </div>
    </div>
  )
}
