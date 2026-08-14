import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '../i18n'
import { tooltipStyle } from './StatusPie'
import { computeVelocityForecast } from '../utils/velocity'

function fmtDate(d, locale) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return String(d)
  }
}

function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10
}

export default function VelocityForecast({ tasks, stats }) {
  const { t, n, pct, locale } = useI18n()
  const fc = useMemo(() => computeVelocityForecast(tasks, stats?.bySprint || []), [tasks, stats])

  if (!fc) return <p className="muted">{t('velocity.noHistory')}</p>

  const showForecast = fc.velocity != null
  const { current } = fc
  const avgValue = showForecast ? n(Math.round(fc.velocity * 10) / 10) : '—'

  const forecastRows = []
  if (showForecast) {
    const v = round1(fc.velocity)
    let cumulative = 0
    for (let k = 1; k <= fc.forecastCount; k++) {
      cumulative = round1(cumulative + v)
      let period = null
      if (fc.hasDates && fc.start && fc.sprintLengthDays) {
        const day = 86400000
        const from = new Date(new Date(fc.start + 'T00:00:00').getTime() + k * fc.sprintLengthDays * day)
        const to = new Date(from.getTime() + (fc.sprintLengthDays - 1) * day)
        period = `${fmtDate(from, locale)} – ${fmtDate(to, locale)}`
      }
      forecastRows.push({ sprint: `${n(k)}+`, points: n(v), cumulative: n(cumulative), period })
    }
  }

  return (
    <div className="velocity">
      <div className="velocity-stats">
        <div className="velocity-stat tone-purple">
          <div className="velocity-stat-value">{avgValue}</div>
          <div className="velocity-stat-label">{t('velocity.avg')}</div>
          <div className="velocity-stat-sub">
            {showForecast
              ? t('velocity.rolling', { n: n(fc.historyCount) })
              : t('velocity.pace')}
          </div>
        </div>

        <div className="velocity-stat tone-blue">
          <div className="velocity-stat-value">{fmtDate(fc.projected, locale)}</div>
          <div className="velocity-stat-label">{t('velocity.projected')}</div>
          <div className="velocity-stat-sub">
            {fc.projectedRange
              ? `${fmtDate(fc.projectedRange[0], locale)} – ${fmtDate(fc.projectedRange[1], locale)}`
              : fc.sprintsRemaining != null
              ? t('velocity.sprintsLeft', { n: n(Math.ceil(fc.sprintsRemaining)) })
              : fc.paceMode
              ? t('velocity.pace')
              : '—'}
          </div>
        </div>

        <div className="velocity-stat tone-green">
          <div className="velocity-stat-value">
            {t('velocity.doneOf', { done: n(current.done), points: n(current.points) })}
          </div>
          <div className="velocity-stat-label">{t('velocity.current')}</div>
          <div className="velocity-stat-sub">
            {current.points ? pct(Math.round((current.done / current.points) * 100)) : '—'}
          </div>
        </div>
      </div>

      <div className="velocity-chart">
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={fc.chart} margin={{ top: 8, right: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="name"
              stroke="var(--axis)"
              fontSize={11}
              tickFormatter={(v) => (String(v).length > 10 ? String(v).slice(0, 9) + '…' : v)}
            />
            <YAxis allowDecimals stroke="var(--axis)" fontSize={12} />
            <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="done" name={t('velocity.chartDone')} radius={[3, 3, 0, 0]}>
              {fc.chart.map((row, i) => (
                <Cell key={i} fill={row.isCurrent ? '#22c55e' : '#3b82f6'} />
              ))}
            </Bar>
            {showForecast && (
              <>
                <Area
                  dataKey="band"
                  name={t('velocity.chartBand')}
                  stroke="none"
                  fill="#a78bfa"
                  fillOpacity={0.18}
                />
                <Bar
                  dataKey="forecast"
                  name={t('velocity.chartForecast')}
                  fill="#a78bfa"
                  fillOpacity={0.55}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="mean"
                  name={t('velocity.chartAvg')}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showForecast && (
        <p className="muted small">
          {t('velocity.forecastNote', { n: n(fc.forecastCount) })}
          {!fc.hasDates && ` ${t('velocity.noDates')}`}
        </p>
      )}
      {!showForecast && !fc.projected && (
        <p className="muted small">{t('velocity.noHistory')}</p>
      )}

      {showForecast && (
        <div className="velocity-forecast-table">
          <div className="velocity-table-title">{t('velocity.table.title')}</div>
          <table className="forecast-table">
            <thead>
              <tr>
                <th>{t('velocity.col.sprint')}</th>
                <th className="num">{t('velocity.col.points')}</th>
                <th className="num">{t('velocity.col.cumulative')}</th>
                {fc.hasDates && <th>{t('velocity.col.period')}</th>}
              </tr>
            </thead>
            <tbody>
              {forecastRows.map((r) => (
                <tr key={r.sprint}>
                  <td className="mono">{r.sprint}</td>
                  <td className="num">{r.points}</td>
                  <td className="num">{r.cumulative}</td>
                  {fc.hasDates && <td className="muted small">{r.period}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {fc.sprintsRemaining != null && (
            <p className="muted small">
              {t('velocity.table.remaining', {
                remaining: n(current.remaining),
                sprints: n(Math.ceil(fc.sprintsRemaining)),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
