import { classifyStatus } from './stats'
import { computeVelocityForecast } from './velocity'
import { computeFlow } from './flow'
import { computeCapacity } from './capacity'
import { computeBurndown } from './burndown'

export function computeReportData({ tasks, stats }) {
  if (!tasks || !tasks.length || !stats) return null

  const velocity = computeVelocityForecast(tasks, stats.bySprint)
  const flow = computeFlow(tasks)
  const capacity = computeCapacity(tasks)
  const burndown = computeBurndown(tasks, stats.bySprint || [])

  const longest = [...stats.cycleTimes].sort((a, b) => b.days - a.days).slice(0, 3)

  const levelNames = (level) =>
    (capacity?.assignees || []).filter((a) => a.level === level).map((a) => a.name)

  const blocked = tasks.filter((t) => classifyStatus(t.status) === 'blocked')

  const weekly = flow?.weekly || []
  const throughput = weekly.length ? weekly[weekly.length - 1] : null
  const wipPeak = flow?.wip?.length ? Math.max(...flow.wip.map((w) => w.wip)) : 0

  return {
    overview: {
      total: stats.total,
      done: stats.done,
      inProgress: stats.inProgress,
      blocked: stats.blocked,
      todo: stats.todo,
      completion: stats.completion,
      pointsDone: stats.donePoints,
      totalPoints: stats.totalPoints,
      pointsCompletion: stats.pointsCompletion,
    },
    burndown: burndown
      ? { sprintName: burndown.sprintName, donePoints: burndown.donePoints, total: burndown.total }
      : null,
    velocity: velocity
      ? {
          velocity: velocity.velocity,
          sigma: velocity.sigma,
          projected: velocity.projected ? velocity.projected.toISOString() : null,
          sprintsRemaining: velocity.sprintsRemaining,
          paceMode: velocity.paceMode,
          currentName: velocity.current.name,
          remaining: velocity.current.remaining,
          hasHistory: velocity.velocity != null,
        }
      : null,
    flow: {
      avgCycle: stats.avgCycleTime,
      longest,
      throughput: throughput ? { week: throughput.week, count: throughput.count } : null,
      wipPeak,
      hasCycle: stats.avgCycleTime != null || longest.length > 0,
    },
    capacity: {
      overloaded: levelNames('overloaded'),
      atCapacity: levelNames('capacity'),
      slackIdle: [...levelNames('slack'), ...levelNames('idle')],
      teamAvg: capacity?.teamAvg ?? null,
      hasCapacity: !!capacity,
    },
    risks: {
      overdue: stats.overdue.slice(0, 8).map((t) => ({
        key: t.key,
        summary: t.summary,
        assignee: t.assignee,
        dueDate: t.dueDate,
      })),
      blocked: blocked.slice(0, 8).map((t) => ({ key: t.key, summary: t.summary, assignee: t.assignee })),
      unestimatedCount: (stats.unestimated || []).length,
    },
  }
}

function joinOr(list, emptyKey, t) {
  return list.length ? list.join(', ') : t(emptyKey)
}

function buildRecommendations(data, ts, n) {
  const recs = []
  const c = data.capacity
  const r = data.risks
  const o = data.overview
  const v = data.velocity

  if (c.overloaded.length) recs.push(ts('rec.overloaded', { names: c.overloaded.join(', ') }))
  if (r.blocked.length)
    recs.push(ts('rec.blocked', { count: n(r.blocked.length), keys: r.blocked.slice(0, 5).map((t) => t.key).join(', ') }))
  if (r.overdue.length) recs.push(ts('rec.overdue', { count: n(r.overdue.length) }))
  if (r.unestimatedCount) recs.push(ts('rec.unestimated', { count: n(r.unestimatedCount) }))
  if (o.completion < 60) recs.push(ts('rec.lowCompletion', { pct: n(o.completion) }))
  if (o.blocked > 0 && o.blocked >= Math.round(o.total * 0.2)) {
    recs.push(ts('rec.manyBlocked', { pct: n(Math.round((o.blocked / o.total) * 100)) }))
  }
  if (data.flow.avgCycle != null && data.flow.avgCycle > 7) {
    recs.push(ts('rec.cycle', { days: n(data.flow.avgCycle) }))
  }
  if (v && v.hasHistory && v.remaining > 0 && v.sprintsRemaining > 1.5) {
    recs.push(ts('rec.horizon', { sprints: n(Math.ceil(v.sprintsRemaining)) }))
  }
  if (v && v.hasHistory && v.currentName && v.remaining <= 0) recs.push(ts('rec.scopeDone'))

  return recs
}

export function buildReportMarkdown(data, { t, n, locale, fileName, window }) {
  const ts = (k, v) => {
    const r = t(k, v)
    return Array.isArray(r) ? r.join('') : String(r)
  }
  const dateFmt = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const lines = []
  const o = data.overview

  const windowLine = window?.start || window?.end
    ? ` - ${ts('report.window', {
        start: window.start ? dateFmt.format(new Date(window.start + 'T00:00:00')) : ts('report.windowOpen'),
        end: window.end ? dateFmt.format(new Date(window.end + 'T00:00:00')) : ts('report.windowOpen'),
      })}`
    : ''

  lines.push(`# ${ts('report.title')}`)
  lines.push(`> ${ts('report.generated', { date: dateFmt.format(new Date()), file: fileName })}${windowLine}`)
  lines.push('')

  lines.push(`## ${ts('report.overview')}`)
  lines.push(`- ${ts('report.tasksDone', { done: n(o.done), total: n(o.total), pct: n(o.completion) })}`)
  lines.push(`- ${ts('report.pointsDone', { done: n(o.pointsDone), total: n(o.totalPoints), pct: n(o.pointsCompletion) })}`)
  lines.push(`- ${ts('report.progress', { inP: n(o.inProgress), blocked: n(o.blocked), todo: n(o.todo) })}`)
  if (data.burndown) {
    lines.push(`- ${ts('report.burndown', { sprint: data.burndown.sprintName, done: n(data.burndown.donePoints), total: n(data.burndown.total) })}`)
  }
  lines.push('')

  lines.push(`## ${ts('report.velocity')}`)
  if (data.velocity && data.velocity.hasHistory) {
    lines.push(`- ${ts('report.avgVelocity', { v: n(Math.round(data.velocity.velocity * 10) / 10) })}`)
    if (data.velocity.projected) {
      const d = dateFmt.format(new Date(data.velocity.projected))
      const sprints =
        data.velocity.sprintsRemaining != null
          ? ts('report.sprintsLeft', { n: n(Math.ceil(data.velocity.sprintsRemaining)) })
          : ''
      lines.push(`- ${ts('report.projected', { date: d, sprints })}`)
    } else {
      lines.push(`- ${ts('report.noVelocity')}`)
    }
  } else {
    lines.push(`- ${ts('report.noVelocity')}`)
  }
  lines.push('')

  lines.push(`## ${ts('report.cycle')}`)
  if (data.flow.hasCycle) {
    if (data.flow.avgCycle != null) {
      lines.push(`- ${ts('report.avgCycle', { days: n(data.flow.avgCycle) })}`)
    }
    for (const c of data.flow.longest) {
      lines.push(`- ${ts('report.longest', { key: c.key, days: n(c.days), summary: c.summary })}`)
    }
  } else {
    lines.push(`- ${ts('report.noCycle')}`)
  }
  lines.push('')

  lines.push(`## ${ts('report.capacity')}`)
  if (data.capacity.hasCapacity) {
    lines.push(`- ${ts('report.overloaded', { names: joinOr(data.capacity.overloaded, 'report.none', t) })}`)
    lines.push(`- ${ts('report.atCapacity', { names: joinOr(data.capacity.atCapacity, 'report.none', t) })}`)
    lines.push(`- ${ts('report.slackIdle', { names: joinOr(data.capacity.slackIdle, 'report.none', t) })}`)
  } else {
    lines.push(`- ${ts('report.noCapacity')}`)
  }
  lines.push('')

  lines.push(`## ${ts('report.risks')}`)
  if (data.risks.overdue.length) {
    lines.push(`- ${ts('report.overdueList', { count: n(data.risks.overdue.length) })}`)
    for (const item of data.risks.overdue) lines.push(`  - ${item.key}: ${item.summary}`)
  } else {
    lines.push(`- ${ts('report.noOverdue')}`)
  }
  if (data.risks.blocked.length) {
    lines.push(`- ${ts('report.blockedList', { count: n(data.risks.blocked.length) })}`)
    for (const item of data.risks.blocked) lines.push(`  - ${item.key}: ${item.summary}`)
  } else {
    lines.push(`- ${ts('report.noBlocked')}`)
  }
  if (data.risks.unestimatedCount) {
    lines.push(`- ${ts('report.unestimated', { count: n(data.risks.unestimatedCount) })}`)
  }
  lines.push('')

  lines.push(`## ${ts('report.recommendations')}`)
  const recs = buildRecommendations(data, ts, n)
  if (recs.length) {
    for (const r of recs) lines.push(`- ${r}`)
  } else {
    lines.push(`- ${ts('report.noRecommendations')}`)
  }

  return lines.join('\n') + '\n'
}
