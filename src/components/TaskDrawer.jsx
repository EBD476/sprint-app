import { useEffect } from 'react'
import { classifyStatus, cycleDays } from '../utils/stats'
import { useI18n } from '../i18n'

function fmtDate(s, locale) {
  if (!s) return null
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(s))
  } catch {
    return String(s).slice(0, 10)
  }
}

export default function TaskDrawer({ task, onClose }) {
  const { t, n, locale } = useI18n()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!task) return null

  const cls = classifyStatus(task.status)
  const days = cycleDays(task)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = cls !== 'done' && task.dueDate && new Date(task.dueDate) < today

  const rows = [
    { label: t('fields.type'), value: task.type },
    { label: t('fields.priority'), value: task.priority },
    { label: t('fields.assignee'), value: task.assignee },
    { label: t('fields.reporter'), value: task.reporter },
    { label: t('fields.sprint'), value: task.sprint },
    { label: t('fields.storyPoints'), value: task.storyPoints != null ? n(task.storyPoints) : null },
    { label: t('fields.timeSpent'), value: task.timeSpent != null ? n(task.timeSpent) : null },
    { label: t('fields.created'), value: fmtDate(task.created, locale) },
    { label: t('fields.updated'), value: fmtDate(task.updated, locale) },
    { label: t('fields.resolved'), value: fmtDate(task.resolved, locale) },
    { label: t('fields.dueDate'), value: fmtDate(task.dueDate, locale) },
  ].filter((r) => r.value)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="task-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={task.key}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <span className="drawer-key mono">{task.key}</span>
          <button className="modal-close" onClick={onClose} aria-label={t('close.aria')}>
            ×
          </button>
        </div>

        <h3 className="drawer-title">{task.summary}</h3>

        <div className="drawer-badges">
          <span className={`status-badge status-${cls}`}>{task.status}</span>
          {overdue && <span className="drawer-overdue-badge">⚠ {t('drawer.overdue')}</span>}
        </div>

        <div className="drawer-cycle">
          {days != null ? (
            <>
              <span className="drawer-cycle-days">{t('drawer.cycleTime', { days: n(days) })}</span>
              <span className="drawer-cycle-sub">{t('stat.cycleSub')}</span>
            </>
          ) : task.created ? (
            <span className="drawer-cycle-days">{t('drawer.openSince', { date: fmtDate(task.created, locale) })}</span>
          ) : null}
        </div>

        <dl className="drawer-fields">
          {rows.map((r) => (
            <div className="drawer-row" key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="drawer-labels">
          <div className="drawer-section-label">{t('fields.labels')}</div>
          {task.labels && task.labels.length ? (
            <div className="drawer-chips">
              {task.labels.map((l) => (
                <span key={l} className="chip-label">
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <span className="muted small">{t('drawer.noLabels')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
