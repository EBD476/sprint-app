import { classifyStatus } from './stats'

const HORIZON_DAYS = 10
const MS_DAY = 86400000

function parseDate(s) {
  const d = s ? new Date(s) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

const LEVEL_ORDER = { overloaded: 0, capacity: 1, slack: 2, idle: 3 }

export function computeCapacity(tasks) {
  if (!tasks || !tasks.length) return null
  if (!tasks.some((t) => t.created)) return null

  const byAssignee = {}
  const names = []

  for (const t of tasks) {
    const name = t.assignee || 'Unassigned'
    if (!byAssignee[name]) {
      byAssignee[name] = { created: [], resolved: [], cycle: [], openCount: 0, openPoints: 0, todo: 0 }
      names.push(name)
    }
    const a = byAssignee[name]
    const c = parseDate(t.created)
    const r = parseDate(t.resolved)
    if (c) a.created.push(dayKey(c))
    if (r) {
      a.resolved.push(dayKey(r))
      if (c) a.cycle.push(Math.max(0, Math.round((r - c) / MS_DAY)))
    }
    const cls = classifyStatus(t.status)
    if (cls === 'in_progress' || cls === 'blocked') {
      a.openCount++
      a.openPoints += t.storyPoints || 0
    }
    if (cls === 'todo') a.todo++
  }

  for (const name of names) {
    byAssignee[name].created.sort()
    byAssignee[name].resolved.sort()
  }

  let minC = null
  let maxD = null
  for (const name of names) {
    const a = byAssignee[name]
    if (a.created.length && (minC === null || a.created[0] < minC)) minC = a.created[0]
    if (a.resolved.length && (maxD === null || a.resolved[a.resolved.length - 1] > maxD)) {
      maxD = a.resolved[a.resolved.length - 1]
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = dayKey(today)
  if (!minC) return null
  const endKey = maxD && maxD > todayKey ? maxD : todayKey

  const days = []
  for (let d = new Date(minC + 'T00:00:00'); dayKey(d) <= endKey; d = new Date(d.getTime() + MS_DAY)) {
    days.push(dayKey(d))
  }

  const allCycles = []
  for (const name of names) allCycles.push(...byAssignee[name].cycle)
  const teamAvg = allCycles.length ? allCycles.reduce((a, b) => a + b, 0) / allCycles.length : null

  const summary = names
    .map((name) => {
      const a = byAssignee[name]
      const avgCycle = a.cycle.length ? a.cycle.reduce((x, y) => x + y, 0) / a.cycle.length : null
      const effCycle = avgCycle ?? teamAvg ?? 3
      const clearDays = a.openCount ? Math.round(a.openCount * effCycle * 10) / 10 : 0
      let level = 'idle'
      if (a.openCount > 0) {
        level = clearDays > HORIZON_DAYS ? 'overloaded' : clearDays > HORIZON_DAYS * 0.5 ? 'capacity' : 'slack'
      }
      return { name, openCount: a.openCount, openPoints: a.openPoints, todo: a.todo, avgCycle, clearDays, level }
    })
    .sort((x, y) => LEVEL_ORDER[x.level] - LEVEL_ORDER[y.level] || y.clearDays - x.clearDays)

  const rows = []
  let maxLoad = 0
  for (const s of summary) {
    const a = byAssignee[s.name]
    const c = a.created
    const r = a.resolved
    let p = 0
    let q = 0
    const loads = days.map((day) => {
      while (p < c.length && c[p] <= day) p++
      while (q < r.length && r[q] <= day) q++
      const v = Math.max(0, p - q)
      if (v > maxLoad) maxLoad = v
      return v
    })
    rows.push({ assignee: s.name, days: loads })
  }

  return { assignees: summary, days, rows, maxLoad, teamAvg }
}
