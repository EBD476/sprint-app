import { useMemo } from 'react'
import { useI18n } from '../i18n'
import { generateStandup } from '../utils/standup'
import { findDecliningConfidence, getTeamSentimentOverview } from '../utils/sentiment'

function TaskLink({ task }) {
  return (
    <span className="standup-task">
      <span className="standup-task-key">{task.key}</span>
      <span className="standup-task-summary">{task.summary}</span>
    </span>
  )
}

function SentimentIndicator({ trend }) {
  const { t } = useI18n()
  const icons = { improving: '📈', declining: '📉', stable: '➡️' }
  return (
    <span className={`sentiment-trend sentiment-trend-${trend}`}>
      <span>{icons[trend]}</span>
      <span>{t(`sentiment.trend.${trend}`)}</span>
    </span>
  )
}

export default function StandupSummary({ tasks }) {
  const { t, n } = useI18n()
  const standup = useMemo(() => generateStandup(tasks), [tasks])
  const declining = useMemo(() => findDecliningConfidence(tasks), [tasks])
  const sentimentOverview = useMemo(() => getTeamSentimentOverview(tasks), [tasks])

  if (!standup) return null

  const { yesterday, today, atRisk, staleInProgress, stats } = standup
  const hasYesterday = yesterday.completed.length > 0 || yesterday.movedToReview.length > 0
  const hasToday = today.inProgress.length > 0 || today.needsResolution.length > 0
  const hasAtRisk = atRisk.length > 0 || staleInProgress.length > 0
  const hasDeclining = declining.length > 0

  return (
    <div className="standup">
      <div className="standup-header">
        <div className="standup-title">{t('standup.title')}</div>
        <div className="standup-date">{new Date().toLocaleDateString()}</div>
      </div>

      <div className="standup-stats">
        <span className="standup-stat">
          <span className="standup-stat-value green">{n(stats.totalDone)}/{n(stats.totalTasks)}</span>
          <span className="standup-stat-label">{t('standup.tasksDone')}</span>
        </span>
        <span className="standup-stat">
          <span className="standup-stat-value">{n(stats.completionPct)}%</span>
          <span className="standup-stat-label">{t('standup.complete')}</span>
        </span>
        {stats.blockedCount > 0 && (
          <span className="standup-stat">
            <span className="standup-stat-value red">{n(stats.blockedCount)}</span>
            <span className="standup-stat-label">{t('standup.blocked')}</span>
          </span>
        )}
        {sentimentOverview.trend !== 'stable' && (
          <span className="standup-stat">
            <SentimentIndicator trend={sentimentOverview.trend} />
          </span>
        )}
      </div>

      {hasYesterday && (
        <div className="standup-section">
          <h4 className="standup-section-title">{t('standup.yesterday')}</h4>
          {yesterday.completed.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge done">{t('standup.completed')} {n(yesterday.completed.length)}</span>
              <div className="standup-tasks">
                {yesterday.completed.slice(0, 5).map(t => <TaskLink key={t.key} task={t} />)}
                {yesterday.completed.length > 5 && <span className="standup-more">+{n(yesterday.completed.length - 5)}</span>}
              </div>
            </div>
          )}
          {yesterday.movedToReview.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge review">{t('standup.toReview')} {n(yesterday.movedToReview.length)}</span>
              <div className="standup-tasks">
                {yesterday.movedToReview.slice(0, 5).map(t => <TaskLink key={t.key} task={t} />)}
                {yesterday.movedToReview.length > 5 && <span className="standup-more">+{n(yesterday.movedToReview.length - 5)}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {hasToday && (
        <div className="standup-section">
          <h4 className="standup-section-title">{t('standup.today')}</h4>
          {today.completed.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge done">{t('standup.completedToday')} {n(today.completed.length)}</span>
              <div className="standup-tasks">
                {today.completed.slice(0, 5).map(t => <TaskLink key={t.key} task={t} />)}
              </div>
            </div>
          )}
          {today.needsResolution.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge blocked">{t('standup.needsResolution')} {n(today.needsResolution.length)}</span>
              <div className="standup-tasks">
                {today.needsResolution.slice(0, 5).map(t => <TaskLink key={t.key} task={t} />)}
              </div>
            </div>
          )}
          {today.inProgress.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge progress">{t('standup.inProgress')} {n(today.inProgress.length)}</span>
              <div className="standup-tasks">
                {today.inProgress.slice(0, 3).map(t => <TaskLink key={t.key} task={t} />)}
                {today.inProgress.length > 3 && <span className="standup-more">+{n(today.inProgress.length - 3)}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {hasAtRisk && (
        <div className="standup-section">
          <h4 className="standup-section-title">{t('standup.atRisk')}</h4>
          {atRisk.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge warning">{t('standup.dueSoon')} {n(atRisk.length)}</span>
              <div className="standup-tasks">
                {atRisk.slice(0, 5).map(t => (
                  <span key={t.key} className="standup-task">
                    <span className="standup-task-key">{t.key}</span>
                    <span className="standup-task-due">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {staleInProgress.length > 0 && (
            <div className="standup-row">
              <span className="standup-badge stale">{t('standup.stale')} {n(staleInProgress.length)}</span>
              <div className="standup-tasks">
                {staleInProgress.slice(0, 5).map(t => <TaskLink key={t.key} task={t} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {hasDeclining && (
        <div className="standup-section">
          <h4 className="standup-section-title">{t('standup.decliningConfidence')}</h4>
          <div className="declining-list">
            {declining.slice(0, 5).map(d => (
              <div key={d.key} className={`declining-item declining-${d.severity}`}>
                <span className="declining-key">{d.key}</span>
                <span className="declining-summary">{d.summary}</span>
                <span className="declining-reason">{t(`sentiment.reason.${d.reason}`)}</span>
              </div>
            ))}
            {declining.length > 5 && <span className="standup-more">+{n(declining.length - 5)}</span>}
          </div>
        </div>
      )}

      {!hasYesterday && !hasToday && !hasAtRisk && !hasDeclining && (
        <div className="standup-empty">{t('standup.allClear')}</div>
      )}
    </div>
  )
}