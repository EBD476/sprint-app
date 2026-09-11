import { useSprint } from '../store/SprintContext'
import { usePrefs } from '../store/PrefsContext'
import { useI18n } from '../i18n'
import FileUpload from '../components/FileUpload'
import StatCard from '../components/StatCard'
import StatusPie from '../components/StatusPie'
import AssigneesBar from '../components/AssigneesBar'
import SprintBar from '../components/SprintBar'
import VelocityForecast from '../components/VelocityForecast'
import BurndownChart from '../components/BurndownChart'
import FlowMetrics from '../components/FlowMetrics'
import CapacityHeatmap from '../components/CapacityHeatmap'
import RetroReport from '../components/RetroReport'
import StandupSummary from '../components/StandupSummary'
import TaskTable from '../components/TaskTable'
import SankeyChart from '../components/SankeyChart'
import NetworkGraph from '../components/NetworkGraph'
import { sprintChartData } from '../utils/stats'

export default function Dashboard() {
  const { tasks, stats, csvMeta, window, addDataset, removeActive, openMapping } = useSprint()
  const { panels } = usePrefs()
  const { t, n, pct } = useI18n()

  const openRemap = () =>
    openMapping({
      fileName: csvMeta.fileName,
      headers: csvMeta.headers,
      rows: csvMeta.rows || [],
      columnMap: csvMeta.columnMap || {},
      mode: 'remap',
    })

  const parsedMeta = (tasksList, meta) => ({ ...meta, tasks: tasksList })

  let page

  if (!csvMeta) {
    page = (
      <div className="page">
        <header className="page-header">
          <h1>{t('nav.dashboard')}</h1>
          <p className="muted">{t('dashboard.emptySub')}</p>
        </header>
        <FileUpload onParsed={(tl, m) => addDataset(parsedMeta(tl, m))} onNeedsMapping={openMapping} />
        <div className="hint-grid">
          <div className="hint-card">
            <h3>{t('dashboard.worksWith')}</h3>
            <p>
              {t('dashboard.worksWithBody', {
                a: <code key="a">Summary</code>,
                b: <code key="b">Status</code>,
                c: <code key="c">Assignee</code>,
                d: <code key="d">Story Points</code>,
                e: <code key="e">Sprint</code>,
              })}
            </p>
          </div>
          <div className="hint-card">
            <h3>{t('dashboard.whatYouGet')}</h3>
            <p>{t('dashboard.whatYouGetBody')}</p>
          </div>
          <div className="hint-card">
            <h3>{t('dashboard.llmAnalysis')}</h3>
            <p>
              {t('dashboard.llmAnalysisBody', { page: <em key="page">{t('nav.analysis')}</em> })}
            </p>
          </div>
        </div>
      </div>
    )
  } else if (!stats) {
    page = (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>{t('nav.dashboard')}</h1>
            <p className="muted">{csvMeta.fileName}</p>
          </div>
        </header>
        <div className="alert alert-warn">
          <strong>{t('window.noTasks')}</strong> — {t('window.noTasksBody')}
        </div>
      </div>
    )
  } else {
    const cycleData = [...stats.cycleTimes].sort((a, b) => b.days - a.days)
    page = (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>{t('nav.dashboard')}</h1>
            <p className="muted">
              {csvMeta.fileName} · {n(stats.total)} {t('common.tasks')} · {n(stats.totalPoints)}{' '}
              {t('common.points')}
            </p>
          </div>
          <div className="header-actions">
            <FileUpload
              onParsed={(tl, m) => addDataset(parsedMeta(tl, m))}
              onNeedsMapping={openMapping}
              compact
            />
            <button className="btn ghost" onClick={openRemap}>
              {t('dashboard.remap')}
            </button>
            <button className="btn ghost" onClick={removeActive}>
              {t('dashboard.clear')}
            </button>
            <button className="btn ghost" onClick={() => globalThis.print()}>
              {t('dashboard.export')}
            </button>
          </div>
        </header>

        <div className="kpi-grid">
          <StatCard label={t('stat.tasksDone')} value={`${n(stats.done)}/${n(stats.total)}`} sub={`${pct(stats.completion)} ${t('stat.complete')}`} tone="green" icon="done" />
          <StatCard label={t('stat.inProgress')} value={n(stats.inProgress)} sub={t('stat.beingWorked')} tone="blue" icon="progress" />
          <StatCard label={t('stat.blocked')} value={n(stats.blocked)} sub={stats.blocked ? t('stat.needsAttention') : t('stat.allClear')} tone="red" icon="blocked" />
          <StatCard label={t('stat.toDo')} value={n(stats.todo)} sub={`${n(stats.todo)} ${t('stat.queued')}`} tone="slate" icon="todo" />
          <StatCard label={t('stat.pointsDone')} value={n(stats.donePoints)} sub={`${pct(stats.pointsCompletion)} ${t('stat.ofTotalPoints')}`} tone="purple" icon="points" />
          <StatCard label={t('stat.avgCycle')} value={stats.avgCycleTime != null ? `${n(stats.avgCycleTime)}${t('common.days')}` : '—'} sub={t('stat.cycleSub')} tone="blue" icon="cycle" />
        </div>

        {stats.overdue.length > 0 && (
          <div className="alert alert-warn">
            <strong>⚠ {n(stats.overdue.length)} {t('dashboard.overdueLabel')}</strong> — {t('dashboard.overdueBody')}
          </div>
        )}

        {panels.standup && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.standup')}</h2>
            <StandupSummary tasks={tasks} />
          </div>
        )}

        {panels.sankey && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.sankey')}</h2>
            <SankeyChart tasks={tasks} />
          </div>
        )}

        {panels.network && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.network')}</h2>
            <NetworkGraph tasks={tasks} />
          </div>
        )}

        {panels.burndown && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.burndown')}</h2>
            <BurndownChart tasks={tasks} stats={stats} />
          </div>
        )}

        {panels.velocity && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.velocity')}</h2>
            <VelocityForecast tasks={tasks} stats={stats} />
          </div>
        )}

        {panels.flow && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.flow')}</h2>
            <FlowMetrics tasks={tasks} />
          </div>
        )}

        {panels.capacity && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.capacity')}</h2>
            <CapacityHeatmap tasks={tasks} />
          </div>
        )}

        {panels.report && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.report')}</h2>
            <RetroReport tasks={tasks} stats={stats} fileName={csvMeta.fileName} window={window} />
          </div>
        )}

        {(panels.status || panels.assignee || panels.sprintProgress || panels.cycleTimes) && (
          <div className="panel-grid">
            {panels.status && (
              <div className="panel">
                <h2 className="panel-title">{t('panel.status')}</h2>
                <StatusPie data={stats.statusDist} />
              </div>
            )}
            {panels.assignee && (
              <div className="panel">
                <h2 className="panel-title">{t('panel.assignee')}</h2>
                <AssigneesBar data={stats.byAssignee} />
              </div>
            )}
            {panels.sprintProgress && stats.bySprint.length > 0 && (
              <div className="panel">
                <h2 className="panel-title">{t('panel.sprintProgress')}</h2>
                <SprintBar data={sprintChartData(stats.bySprint)} />
              </div>
            )}
            {panels.cycleTimes && (
              <div className="panel">
                <h2 className="panel-title">{t('panel.cycleTimes')}</h2>
                {cycleData.length ? (
                  <ul className="cycle-list">
                    {cycleData.slice(0, 6).map((c) => (
                      <li key={c.key}>
                        <span className="mono">{c.key}</span>
                        <span className="cycle-summary">{c.summary}</span>
                        <span className={`cycle-days${c.days >= 14 ? ' bad' : ''}`}>{n(c.days)}{t('common.days')}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('panel.cycleEmpty')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {panels.tasks && (
          <div className="panel">
            <h2 className="panel-title">{t('panel.tasks')}</h2>
            <TaskTable tasks={tasks} />
          </div>
        )}
      </div>
    )
  }

  return page
}
