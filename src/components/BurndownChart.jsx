import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '../i18n'
import { tooltipStyle } from './StatusPie'
import { computeBurndown } from '../utils/burndown'

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

export default function BurndownChart({ tasks, stats }) {
  const { t, n, locale } = useI18n()
  const [mode, setMode] = useState('burn')
  const bd = useMemo(() => computeBurndown(tasks, stats?.bySprint || []), [tasks, stats])

  if (!bd) return <p className="muted">{t('velocity.noDates')}</p>

  const labelOf = (k) => fmtKey(k, locale)
  const data = bd.data.map((d) => ({ ...d, label: labelOf(d.date) }))

  return (
    <div className="burndown">
      <div className="burndown-head">
        <p className="burndown-summary">
          {bd.sprintName} · {t('burndown.doneOf', { done: n(bd.donePoints), points: n(bd.total) })}
        </p>
        <div className="burndown-toggle">
          <button className={mode === 'burn' ? 'active' : ''} onClick={() => setMode('burn')}>
            {t('burndown.viewBurn')}
          </button>
          <button className={mode === 'burnup' ? 'active' : ''} onClick={() => setMode('burnup')}>
            {t('burndown.viewBurnup')}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" stroke="var(--axis)" fontSize={11} />
          <YAxis allowDecimals={false} domain={[0, bd.total]} stroke="var(--axis)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          {bd.hasToday && (
            <ReferenceLine x={labelOf(bd.today)} stroke="var(--primary)" strokeDasharray="4 4" />
          )}
          {mode === 'burn' ? (
            <>
              <Line
                type="linear"
                dataKey="ideal"
                name={t('burndown.ideal')}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="stepAfter"
                dataKey="actual"
                name={t('burndown.actual')}
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
              />
            </>
          ) : (
            <>
              <Line
                type="linear"
                dataKey="scope"
                name={t('burndown.scope')}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="linear"
                dataKey="idealDone"
                name={t('burndown.ideal')}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="stepAfter"
                dataKey="done"
                name={t('burndown.completed')}
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
