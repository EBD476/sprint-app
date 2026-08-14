const WINDOW = 3
const FORECAST_SPRINTS = 3
const MS_DAY = 86400000

function meanStd(values) {
  const list = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (!list.length) return { mean: null, std: 0 }
  const mean = list.reduce((a, b) => a + b, 0) / list.length
  const variance = list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length
  return { mean, std: Math.sqrt(variance) }
}

function parseDate(s) {
  const d = s ? new Date(s) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10
}

export function computeVelocityForecast(tasks, bySprint) {
  if (!tasks || !tasks.length || !bySprint || !bySprint.length) return null

  const sprints = [...bySprint]
  const current = sprints[sprints.length - 1]
  const completed = sprints.slice(0, -1).filter((s) => s.pointsDone > 0)

  const history = completed.map((s) => s.pointsDone)
  const windowed = history.slice(-WINDOW)
  const { mean: velocity, std: sigma } = meanStd(windowed.length ? windowed : history)

  const currentTasks = tasks.filter((t) => (t.sprint || 'Unnamed') === current.name)
  let start = null
  let plannedEnd = null
  for (const t of currentTasks) {
    const c = parseDate(t.created)
    if (c && (start === null || c < start)) start = c
    const d = parseDate(t.dueDate)
    if (d && (plannedEnd === null || d > plannedEnd)) plannedEnd = d
  }

  const sprintLengthDays =
    start && plannedEnd ? Math.max(1, Math.round((plannedEnd - start) / MS_DAY)) : null

  const points = current.points || 0
  const done = current.pointsDone || 0
  const remaining = Math.max(0, points - done)

  let projected = null
  let projectedRange = null
  let sprintsRemaining = null
  let paceMode = false

  if (velocity) {
    sprintsRemaining = remaining / velocity
    if (start && sprintLengthDays) {
      const proj = new Date(start.getTime() + sprintsRemaining * sprintLengthDays * MS_DAY)
      const lowV = Math.max(velocity - sigma, velocity * 0.5)
      const highV = velocity + sigma
      const a = new Date(start.getTime() + (remaining / highV) * sprintLengthDays * MS_DAY)
      const b = new Date(start.getTime() + (remaining / lowV) * sprintLengthDays * MS_DAY)
      projected = proj
      projectedRange = a <= b ? [a, b] : [b, a]
    }
  } else if (done > 0 && start) {
    const now = new Date()
    const elapsed = Math.max(1, Math.round((now - start) / MS_DAY))
    const pace = done / elapsed
    if (pace > 0) {
      projected = new Date(now.getTime() + Math.ceil(remaining / pace) * MS_DAY)
      paceMode = true
    }
  }

  const chart = sprints.map((s, i) => ({
    name: s.name,
    done: s.pointsDone,
    forecast: null,
    mean: null,
    band: null,
    isCurrent: i === sprints.length - 1,
  }))

  let forecastCount = 0
  if (velocity) {
    forecastCount = FORECAST_SPRINTS
    const low = Math.max(velocity - sigma, 0)
    const high = velocity + sigma
    for (let k = 1; k <= FORECAST_SPRINTS; k++) {
      chart.push({
        name: `+${k}`,
        done: null,
        forecast: round1(velocity),
        mean: round1(velocity),
        band: [round1(low), round1(high)],
        isCurrent: false,
      })
    }
  }

  return {
    velocity,
    sigma,
    historyCount: windowed.length || history.length,
    usedRolling: windowed.length > 0,
    forecastCount,
    current: { name: current.name, done, points, remaining },
    projected,
    projectedRange,
    sprintsRemaining,
    paceMode,
    hasDates: !!(start && plannedEnd),
    sprintLengthDays,
    start: start ? start.toISOString().slice(0, 10) : null,
    chart,
  }
}
