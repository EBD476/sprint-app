import { useSprint } from '../store/SprintContext'
import { computeStats } from '../utils/stats'
import { applyWindow } from '../utils/window'
import { useI18n } from '../i18n'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { tooltipStyle } from '../components/StatusPie'

const COLORS = ['#3b82f6', '#a78bfa', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#eab308']

export default function Compare() {
  const { datasets, window } = useSprint()
  const { t, n, pct } = useI18n()

  if (datasets.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>{t('nav.compare')}</h1>
          <p className="muted">{t('compare.emptySub')}</p>
        </header>
        <div className="empty-state">
          <p>{t('compare.noData')}</p>
        </div>
      </div>
    )
  }

  const statsList = datasets
    .map((d) => ({ ds: d, s: computeStats(applyWindow(d.tasks, window)) }))
    .filter(({ s }) => s != null)

  const completionData = statsList.map(({ ds, s }) => ({
    name: ds.label,
    tasksPct: s.completion,
    pointsPct: s.pointsCompletion,
  }))

  const statusData = statsList.map(({ ds, s }) => ({
    name: ds.label,
    done: s.done,
    inProgress: s.inProgress,
    blocked: s.blocked,
    todo: s.todo,
  }))

  const sprintNames = []
  for (const { s } of statsList) {
    for (const sp of s.bySprint) {
      if (!sprintNames.includes(sp.name)) sprintNames.push(sp.name)
    }
  }

  const velocityData = sprintNames.map((name) => {
    const point = { name }
    statsList.forEach(({ ds, s }) => {
      const sp = s.bySprint.find((x) => x.name === name)
      point[ds.id] = sp ? sp.pointsDone : null
    })
    return point
  })

  const axisTick = { fontSize: 12, fill: 'var(--axis)' }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('nav.compare')}</h1>
          <p className="muted">
            {n(datasets.length)} {t('compare.datasetsLoaded')}
          </p>
        </div>
      </header>

      <div className="panel-grid">
        <div className="panel">
          <h2 className="panel-title">{t('compare.completion')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={completionData} margin={{ top: 8, right: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="name" stroke="var(--axis)" tick={axisTick} tickFormatter={(v) => (String(v).length > 12 ? String(v).slice(0, 11) + '…' : v)} />
              <YAxis domain={[0, 100]} unit="%" stroke="var(--axis)" tick={axisTick} />
              <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="tasksPct" name={t('chart.tasksPct')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pointsPct" name={t('chart.pointsPct')} fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2 className="panel-title">{t('compare.status')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="name" stroke="var(--axis)" tick={axisTick} tickFormatter={(v) => (String(v).length > 12 ? String(v).slice(0, 11) + '…' : v)} />
              <YAxis allowDecimals={false} stroke="var(--axis)" tick={axisTick} />
              <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="done" stackId="a" name={t('status.done')} fill="#22c55e" />
              <Bar dataKey="inProgress" stackId="a" name={t('status.inProgress')} fill="#3b82f6" />
              <Bar dataKey="blocked" stackId="a" name={t('status.blocked')} fill="#ef4444" />
              <Bar dataKey="todo" stackId="a" name={t('status.todo')} fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {velocityData.length > 0 && (
          <div className="panel">
            <h2 className="panel-title">{t('compare.velocity')}</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={velocityData} margin={{ top: 8, right: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="name" stroke="var(--axis)" tick={axisTick} tickFormatter={(v) => (String(v).length > 12 ? String(v).slice(0, 11) + '…' : v)} />
                <YAxis allowDecimals={false} stroke="var(--axis)" tick={axisTick} />
                <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
                <Legend />
                {statsList.map(({ ds }, i) => (
                  <Bar key={ds.id} dataKey={ds.id} name={ds.label} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="panel">
          <h2 className="panel-title">{t('compare.overview')}</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t('compare.col.dataset')}</th>
                  <th>{t('compare.col.tasks')}</th>
                  <th>{t('compare.col.done')}</th>
                  <th>{t('compare.col.blocked')}</th>
                  <th>{t('compare.col.points')}</th>
                  <th>{t('compare.col.pointsDone')}</th>
                  <th>{t('compare.col.avgCycle')}</th>
                </tr>
              </thead>
              <tbody>
                {statsList.map(({ ds, s }) => (
                  <tr key={ds.id}>
                    <td>{ds.label}</td>
                    <td>{n(s.total)}</td>
                    <td>
                      {n(s.done)} ({pct(s.completion)})
                    </td>
                    <td>{n(s.blocked)}</td>
                    <td>{n(s.totalPoints)}</td>
                    <td>{n(s.donePoints)}</td>
                    <td>{s.avgCycleTime != null ? `${n(s.avgCycleTime)}${t('common.days')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
