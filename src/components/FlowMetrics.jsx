import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { useI18n } from '../i18n'
import { tooltipStyle } from './StatusPie'
import { computeFlow } from '../utils/flow'

function fmtKey(k, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(k + 'T00:00:00'))
  } catch {
    return k
  }
}

function fmtTs(ts, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(ts))
  } catch {
    return String(ts)
  }
}

function dotColor(days) {
  return days > 14 ? '#ef4444' : days > 7 ? '#f59e0b' : '#22c55e'
}

export default function FlowMetrics({ tasks }) {
  const { t, n, locale } = useI18n()
  const flow = useMemo(() => computeFlow(tasks), [tasks])

  if (!flow) return <p className="muted">{t('flow.empty')}</p>

  const weekly = flow.weekly.map((w) => ({ ...w, label: fmtKey(w.week, locale) }))
  const wipData = flow.wip.map((d) => ({ ...d, label: fmtKey(d.date, locale) }))

  const ScatterTip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null
    const p = payload[0].payload
    return (
      <div style={tooltipStyle}>
        <div>
          <strong>{p.key || p.summary || '—'}</strong>
        </div>
        {p.summary && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.summary}</div>}
        <div>{fmtTs(p.x, locale)}</div>
        <div>
          {n(p.y)} {t('common.days')}
        </div>
      </div>
    )
  }

  return (
    <div className="flow-grid">
      <div className="flow-chart">
        <div className="flow-title">{t('flow.scatter')}</div>
        {flow.hasScatter ? (
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => fmtTs(v, locale)}
                stroke="var(--axis)"
                fontSize={11}
              />
              <YAxis type="number" dataKey="y" allowDecimals={false} stroke="var(--axis)" fontSize={12} />
              <ZAxis type="number" range={[36, 36]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTip />} />
              <Scatter data={flow.scatter} dataKey="y" name={t('flow.cycleDays')}>
                {flow.scatter.map((p, i) => (
                  <Cell key={i} fill={dotColor(p.y)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted small">{t('flow.noResolved')}</p>
        )}
      </div>

      <div className="flow-chart">
        <div className="flow-title">{t('flow.throughput')}</div>
        {flow.hasWeekly ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" stroke="var(--axis)" fontSize={11} minTickGap={16} />
              <YAxis allowDecimals={false} stroke="var(--axis)" fontSize={12} />
              <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" name={t('flow.resolved')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted small">{t('flow.noResolved')}</p>
        )}
      </div>

      <div className="flow-chart">
        <div className="flow-title">{t('flow.wip')}</div>
        {flow.hasWip ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={wipData} margin={{ top: 8, right: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" stroke="var(--axis)" fontSize={11} minTickGap={24} />
              <YAxis allowDecimals={false} stroke="var(--axis)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="stepAfter"
                dataKey="wip"
                name={t('flow.wipSeries')}
                stroke="#a78bfa"
                fill="#a78bfa"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted small">{t('flow.noDates')}</p>
        )}
      </div>
    </div>
  )
}
