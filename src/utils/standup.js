import { classifyStatus, cycleDays } from './stats'

function toStartOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isWithinDays(date, days, now) {
  if (!date) return false
  const d = new Date(date)
  const diff = (now.getTime() - d.getTime()) / 86400000
  return diff >= 0 && diff <= days
}

export function generateStandup(tasks, { today: now = new Date() } = {}) {
  if (!tasks || tasks.length === 0) return null

  const today = toStartOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const classified = tasks.map(t => ({ ...t, cls: classifyStatus(t.status) }))

  const completedYesterday = classified.filter(t => {
    if (t.cls !== 'done') return false
    if (t.resolved) {
      return isSameDay(new Date(t.resolved), yesterday)
    }
    if (t.updated) {
      return isSameDay(new Date(t.updated), yesterday)
    }
    return false
  })

  const movedToReview = classified.filter(t => {
    if (t.cls !== 'in_progress') return false
    const status = String(t.status || '').toLowerCase()
    if (!/review|verify|qa|test/.test(status)) return false
    if (t.updated) return isWithinDays(t.updated, 1, today)
    return false
  })

  const blocked = classified.filter(t => t.cls === 'blocked')

  const needsResolution = blocked.filter(t => {
    if (t.updated) return isWithinDays(t.updated, 2, today)
    return true
  })

  const avgCycle = tasks.reduce((sum, t) => {
    const days = cycleDays(t)
    return days != null ? sum + days : sum
  }, 0) / (tasks.filter(t => t.resolved).length || 1)

  const atRisk = classified.filter(t => {
    if (t.cls === 'done') return false
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    const daysUntilDue = (due.getTime() - today.getTime()) / 86400000
    if (daysUntilDue < 0) return false
    if (daysUntilDue <= 2) return true
    const age = t.created ? (today.getTime() - new Date(t.created).getTime()) / 86400000 : 0
    if (age > avgCycle * 1.5 && daysUntilDue <= 5) return true
    return false
  })

  const staleInProgress = classified.filter(t => {
    if (t.cls !== 'in_progress') return false
    if (!t.created) return false
    const age = (today.getTime() - new Date(t.created).getTime()) / 86400000
    return age > avgCycle * 2
  })

  const completedToday = classified.filter(t => {
    if (t.cls !== 'done') return false
    if (t.resolved) return isSameDay(new Date(t.resolved), today)
    if (t.updated) return isSameDay(new Date(t.updated), today)
    return false
  })

  const inProgress = classified.filter(t => t.cls === 'in_progress')

  const totalDone = classified.filter(t => t.cls === 'done').length
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const donePoints = tasks.filter(t => t.cls === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0)

  return {
    yesterday: {
      completed: completedYesterday,
      movedToReview,
    },
    today: {
      inProgress,
      completed: completedToday,
      needsResolution,
    },
    atRisk,
    staleInProgress,
    stats: {
      totalTasks: tasks.length,
      totalDone,
      totalPoints,
      donePoints,
      completionPct: tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0,
      blockedCount: blocked.length,
      avgCycleTime: Math.round(avgCycle * 10) / 10,
    }
  }
}