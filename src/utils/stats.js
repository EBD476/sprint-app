const DONE_RE = /done|closed|complete|resolved|shipped|released|cancelled|canceled|removed/i
const BLOCKED_RE = /block|impede|waiting/i
const INPROG_RE = /progress|review|develop|testing|test\b|qa|build|in flight|wip/i

export function classifyStatus(status) {
  const s = String(status || '')
  if (!s) return 'todo'
  if (BLOCKED_RE.test(s)) return 'blocked'
  if (DONE_RE.test(s)) return 'done'
  if (INPROG_RE.test(s)) return 'in_progress'
  return 'todo'
}

export const STATUS_LABELS = {
  done: 'Done',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  todo: 'To Do',
}

const STATUS_ORDER = ['done', 'in_progress', 'blocked', 'todo']

export function cycleDays(task) {
  if (!task || !task.resolved) return null
  const created = task.created ? new Date(task.created) : null
  const resolved = new Date(task.resolved)
  const ms = created ? resolved - created : 0
  return Math.max(0, Math.round(ms / 86400000))
}

export function computeStats(tasks) {
  if (!tasks || tasks.length === 0) return null

  const classified = tasks.map((t) => ({ ...t, cls: classifyStatus(t.status) }))

  const total = classified.length
  const done = classified.filter((t) => t.cls === 'done')
  const inProgress = classified.filter((t) => t.cls === 'in_progress')
  const blocked = classified.filter((t) => t.cls === 'blocked')
  const todo = classified.filter((t) => t.cls === 'todo')

  const sumPoints = (list) => list.reduce((acc, t) => acc + (t.storyPoints || 0), 0)

  const totalPoints = sumPoints(classified)
  const donePoints = sumPoints(done)
  const completion = total ? Math.round((done.length / total) * 100) : 0
  const pointsCompletion = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0

  const statusDist = {}
  for (const cls of STATUS_ORDER) {
    statusDist[cls] = { label: STATUS_LABELS[cls], count: 0, points: 0 }
  }
  for (const t of classified) statusDist[t.cls].count++
  for (const t of classified) statusDist[t.cls].points += t.storyPoints || 0

  const assigneeCount = {}
  const assigneePoints = {}
  for (const t of classified) {
    const a = t.assignee || 'Unassigned'
    assigneeCount[a] = (assigneeCount[a] || 0) + 1
    assigneePoints[a] = (assigneePoints[a] || 0) + (t.storyPoints || 0)
  }
  const byAssignee = Object.keys(assigneeCount)
    .map((name) => ({
      name,
      tasks: assigneeCount[name],
      points: assigneePoints[name],
    }))
    .sort((a, b) => b.tasks - a.tasks)

  const typeCount = {}
  for (const t of classified) typeCount[t.type] = (typeCount[t.type] || 0) + 1
  const byType = Object.entries(typeCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const bySprint = {}
  for (const t of classified) {
    const s = t.sprint || 'Unnamed'
    if (!bySprint[s]) bySprint[s] = { name: s, total: 0, done: 0, points: 0, pointsDone: 0 }
    bySprint[s].total++
    bySprint[s].points += t.storyPoints || 0
    if (t.cls === 'done') {
      bySprint[s].done++
      bySprint[s].pointsDone += t.storyPoints || 0
    }
  }
  const sprintList = Object.values(bySprint)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = classified.filter((t) => t.cls !== 'done' && t.dueDate && new Date(t.dueDate) < today)

  const cycleTimes = classified
    .filter((t) => t.resolved)
    .map((t) => ({
      key: t.key,
      summary: t.summary,
      assignee: t.assignee,
      days: cycleDays(t),
    }))
    .filter((c) => c.days >= 0)

  const avgCycleTime = cycleTimes.length
    ? Math.round((cycleTimes.reduce((a, c) => a + c.days, 0) / cycleTimes.length) * 10) / 10
    : null

  const unestimated = classified.filter((t) => t.storyPoints == null)

  return {
    total,
    done: done.length,
    inProgress: inProgress.length,
    blocked: blocked.length,
    todo: todo.length,
    totalPoints,
    donePoints,
    completion,
    pointsCompletion,
    statusDist,
    byAssignee,
    byType,
    bySprint: sprintList,
    cycleTimes,
    avgCycleTime,
    overdue,
    unestimated,
  }
}

export function sprintChartData(bySprint) {
  return bySprint.map((s) => ({
    name: s.name,
    Total: s.points || s.total,
    Done: s.pointsDone || s.done,
  }))
}
