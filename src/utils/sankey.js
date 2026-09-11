import { classifyStatus } from './stats'

export function computeSankeyData(tasks) {
  if (!tasks || tasks.length === 0) return null

  const classified = tasks.map((t) => ({ ...t, cls: classifyStatus(t.status) }))

  const counts = {
    todo: classified.filter((t) => t.cls === 'todo').length,
    in_progress: classified.filter((t) => t.cls === 'in_progress').length,
    blocked: classified.filter((t) => t.cls === 'blocked').length,
    done: classified.filter((t) => t.cls === 'done').length,
  }

  const total = counts.todo + counts.in_progress + counts.blocked + counts.done

  if (total === 0) return null

  const todoToInProgress = counts.in_progress
  const todoToBlocked = counts.blocked

  const doneFromInProgress = Math.round(counts.done * (counts.in_progress / (counts.in_progress + counts.blocked || 1)))
  const doneFromBlocked = counts.done - doneFromInProgress

  const nodes = [
    { name: 'To Do' },
    { name: 'In Progress' },
    { name: 'Blocked' },
    { name: 'Done' },
  ]

  const links = [
    { source: 0, target: 1, value: todoToInProgress },
    { source: 0, target: 2, value: todoToBlocked },
    { source: 1, target: 3, value: doneFromInProgress },
    { source: 2, target: 3, value: doneFromBlocked },
  ].filter((l) => l.value > 0)

  return { nodes, links, counts }
}

export function getSankeyColors() {
  return {
    'To Do': '#64748b',
    'In Progress': '#3b82f6',
    'Blocked': '#ef4444',
    'Done': '#22c55e',
  }
}