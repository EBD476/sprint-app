const MS_DAY = 86400000

function parseDate(s) {
  const d = s ? new Date(s) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

export function computeBurndown(tasks, bySprint) {
  if (!tasks || !tasks.length || !bySprint || !bySprint.length) return null

  const current = bySprint[bySprint.length - 1]
  const currentTasks = tasks.filter((t) => (t.sprint || 'Unnamed') === current.name)
  if (!currentTasks.length) return null

  const total = current.points || currentTasks.reduce((a, t) => a + (t.storyPoints || 0), 0)
  if (!total) return null

  let start = null
  let end = null
  for (const t of currentTasks) {
    const c = parseDate(t.created)
    if (c && (start === null || c < start)) start = c
    const d = parseDate(t.dueDate)
    if (d && (end === null || d > end)) end = d
  }
  if (!start || !end) return null
  if (end < start) end = start

  const donePoints = current.pointsDone || 0

  const resolved = currentTasks
    .map((t) => ({ d: parseDate(t.resolved), pts: t.storyPoints || 0 }))
    .filter((r) => r.d)

  const startKey = dayKey(start)
  const endKey = dayKey(end)
  const keySet = new Set([startKey, endKey])
  const byDate = {}
  for (const r of resolved) {
    const k = dayKey(r.d)
    if (k < startKey || k > endKey) continue
    keySet.add(k)
    byDate[k] = (byDate[k] || 0) + r.pts
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tKey = dayKey(today)
  const showToday = tKey >= startKey && tKey <= endKey
  if (showToday) keySet.add(tKey)

  const keys = [...keySet].sort()
  const span = end.getTime() - start.getTime()

  let cum = 0
  const data = keys.map((k) => {
    cum += byDate[k] || 0
    const d = new Date(k + 'T00:00:00')
    const frac = Math.max(0, Math.min(1, (end.getTime() - d.getTime()) / span))
    const ideal = Math.max(0, Math.round(total * frac * 10) / 10)
    let actual = total - cum
    if (showToday && k === tKey) actual = total - donePoints
    if (showToday && k > tKey) actual = null
    const done = actual == null ? null : total - actual
    const idealDone = Math.round((total - ideal) * 10) / 10
    return { date: k, ideal, actual, done, idealDone, scope: total }
  })

  return {
    sprintName: current.name,
    total,
    donePoints,
    start: startKey,
    end: endKey,
    today: tKey,
    hasToday: showToday,
    data,
  }
}
