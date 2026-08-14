export function applyWindow(tasks, w) {
  if (!tasks || !tasks.length) return tasks
  const start = w?.start ? String(w.start).slice(0, 10) : null
  const end = w?.end ? String(w.end).slice(0, 10) : null
  if (!start && !end) return tasks
  return tasks.filter((t) => {
    if (!t.created) return true
    const cd = String(t.created).slice(0, 10)
    if (start && cd < start) return false
    if (end && cd > end) return false
    return true
  })
}

export function dataRange(tasks) {
  let min = null
  let max = null
  for (const t of tasks || []) {
    if (!t.created) continue
    const d = String(t.created).slice(0, 10)
    if (min === null || d < min) min = d
    if (max === null || d > max) max = d
  }
  return { min, max }
}

export function sprintRanges(tasks) {
  const byName = {}
  for (const t of tasks || []) {
    if (!t.created) continue
    const name = t.sprint || 'Unnamed'
    const iso = String(t.created).slice(0, 10)
    const r = byName[name] || (byName[name] = { name, start: iso, end: iso })
    if (iso < r.start) r.start = iso
    if (iso > r.end) r.end = iso
  }
  return Object.values(byName).sort((a, b) => (a.end < b.end ? 1 : -1))
}

export function activeSprintRange(tasks) {
  const ranges = sprintRanges(tasks)
  return ranges.length ? { start: ranges[0].start, end: ranges[0].end } : null
}

export function lastSprintsRange(tasks, count) {
  const ranges = sprintRanges(tasks).slice(0, count)
  if (!ranges.length) return null
  return {
    start: ranges.reduce((m, r) => (r.start < m ? r.start : m), ranges[0].start),
    end: ranges.reduce((m, r) => (r.end > m ? r.end : m), ranges[0].end),
  }
}

const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function currentQuarterRange(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  return { start: toIso(start), end: toIso(now) }
}
