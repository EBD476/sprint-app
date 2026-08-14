const MS_DAY = 86400000

function parseDate(s) {
  const d = s ? new Date(s) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d) {
  const monday = new Date(d.getTime() - (d.getDay() + 6) % 7 * MS_DAY)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function computeFlow(tasks) {
  if (!tasks || !tasks.length) return null

  const scatter = []
  const createdBy = {}
  const resolvedBy = {}
  const weekMap = {}
  let minC = null
  let maxD = null

  for (const t of tasks) {
    const c = parseDate(t.created)
    const r = parseDate(t.resolved)

    if (c) {
      createdBy[dayKey(c)] = (createdBy[dayKey(c)] || 0) + 1
      if (minC === null || c < minC) minC = c
    }
    if (r) {
      resolvedBy[dayKey(r)] = (resolvedBy[dayKey(r)] || 0) + 1
      if (maxD === null || r > maxD) maxD = r
      weekMap[dayKey(startOfWeek(r))] = (weekMap[dayKey(startOfWeek(r))] || 0) + 1
    }

    if (c && r) {
      const days = Math.max(0, Math.round((r - c) / MS_DAY))
      scatter.push({ x: r.getTime(), y: days, key: t.key, summary: t.summary, assignee: t.assignee })
    }
  }

  const weekly = Object.keys(weekMap)
    .map((k) => ({ week: k, count: weekMap[k] }))
    .sort((a, b) => a.week.localeCompare(b.week))

  let wip = []
  if (minC) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = maxD && maxD > today ? maxD : today
    const startD = new Date(minC.getTime())
    startD.setHours(0, 0, 0, 0)

    let count = 0
    for (let d = new Date(startD.getTime()); d <= end; d = new Date(d.getTime() + MS_DAY)) {
      const k = dayKey(d)
      count += createdBy[k] || 0
      count -= resolvedBy[k] || 0
      wip.push({ date: k, wip: Math.max(0, count) })
    }
  }

  return {
    scatter,
    weekly,
    wip,
    hasScatter: scatter.length > 0,
    hasWeekly: weekly.length > 0,
    hasWip: wip.length > 0,
  }
}
