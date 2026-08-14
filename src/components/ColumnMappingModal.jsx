import { useState } from 'react'
import { useI18n } from '../i18n'

const FIELDS = [
  { field: 'key' },
  { field: 'summary', required: true },
  { field: 'type' },
  { field: 'status' },
  { field: 'priority' },
  { field: 'assignee' },
  { field: 'reporter' },
  { field: 'sprint' },
  { field: 'storyPoints' },
  { field: 'timeSpent' },
  { field: 'labels' },
  { field: 'created' },
  { field: 'resolved' },
  { field: 'dueDate' },
]

export default function ColumnMappingModal({ data, onCancel, onApply }) {
  const [map, setMap] = useState(() => ({ ...data.columnMap }))
  const [error, setError] = useState(null)
  const { t } = useI18n()

  const sample = data.rows[0] || {}
  const isEmpty = data.rows.length === 0

  const setField = (field, value) =>
    setMap((m) => {
      const next = { ...m }
      if (value) next[field] = value
      else delete next[field]
      return next
    })

  const handleApply = () => {
    if (isEmpty) return
    if (!map.summary && !map.key) {
      setError(t('mapping.requireError'))
      return
    }
    const result = onApply(map)
    if (typeof result === 'string') setError(result)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('mapping.title')}</h2>
          <button className="modal-close" onClick={onCancel} aria-label={t('close.aria')}>
            ×
          </button>
        </div>

        <p className="muted small modal-note">
          {t('mapping.note', { file: data.fileName })}
        </p>

        <div className="map-list">
          {FIELDS.map(({ field, required }) => {
            const auto = data.columnMap[field]
            return (
              <div className="map-row" key={field}>
                <div className="map-field">
                  {t(`fields.${field}`)}
                  {required ? <span className="map-required">{t('mapping.required')}</span> : null}
                  {auto && <span className="map-badge">{t('mapping.auto')}</span>}
                </div>
                <select
                  className="map-select"
                  value={map[field] || ''}
                  onChange={(e) => setField(field, e.target.value)}
                >
                  <option value="">{t('mapping.notMapped')}</option>
                  {data.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="map-preview" title={map[field] ? sample[map[field]] : ''}>
                  {map[field] ? sample[map[field]] ?? '' : ''}
                </div>
              </div>
            )
          })}
        </div>

        {isEmpty && <div className="alert alert-error">{t('mapping.emptyError')}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            {t('mapping.cancel')}
          </button>
          <button className="btn primary" onClick={handleApply} disabled={isEmpty}>
            {t('mapping.apply')}
          </button>
        </div>
      </div>
    </div>
  )
}
