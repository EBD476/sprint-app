import { Fragment, useMemo } from 'react'
import { useI18n } from '../i18n'
import { computeCapacity } from '../utils/capacity'

function fmtDay(k, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(k + 'T00:00:00'))
  } catch {
    return k
  }
}

export default function CapacityHeatmap({ tasks }) {
  const { t, n, locale } = useI18n()
  const cap = useMemo(() => computeCapacity(tasks), [tasks])

  if (!cap) return <p className="muted">{t('capacity.empty')}</p>

  return (
    <div className="capacity">
      <table className="capacity-table">
        <thead>
          <tr>
            <th>{t('capacity.assignee')}</th>
            <th className="num">{t('capacity.open')}</th>
            <th className="num">{t('capacity.avgCycle')}</th>
            <th className="num">{t('capacity.toClear')}</th>
            <th>{t('capacity.load')}</th>
          </tr>
        </thead>
        <tbody>
          {cap.assignees.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td className="num">
                {n(a.openCount)}
                {a.openPoints ? ` (${n(a.openPoints)} ${t('common.points')})` : ''}
              </td>
              <td className="num">
                {a.avgCycle != null ? `${n(Math.round(a.avgCycle * 10) / 10)}${t('common.days')}` : '—'}
              </td>
              <td className="num">
                {a.openCount ? `${n(a.clearDays)}${t('common.days')}` : '—'}
              </td>
              <td>
                <span className={`load-badge load-${a.level}`}>{t(`capacity.${a.level}`)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{t('capacity.hint', { n: n(10) })}</p>

      <div className="heatmap-scroll">
        <div className="heatmap" style={{ gridTemplateColumns: `120px repeat(${cap.days.length}, 1fr)` }}>
          <div className="hm-cell hm-corner" />
          {cap.days.map((d, i) => (
            <div key={d} className="hm-cell hm-head">
              {i % 5 === 0 || i === cap.days.length - 1 ? fmtDay(d, locale) : ''}
            </div>
          ))}
          {cap.rows.map((row) => (
            <Fragment key={row.assignee}>
              <div className="hm-cell hm-assignee" title={row.assignee}>
                {row.assignee}
              </div>
              {row.days.map((v, i) => (
                <div
                  key={i}
                  className="hm-cell hm-load"
                  style={{
                    background: v
                      ? `rgba(59, 130, 246, ${(0.14 + (v / cap.maxLoad) * 0.8).toFixed(2)})`
                      : 'var(--bg-soft)',
                  }}
                  title={`${row.assignee} · ${fmtDay(cap.days[i], locale)} · ${v}`}
                >
                  {v > 0 ? <span>{n(v)}</span> : null}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
