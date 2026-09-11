export function computeNetworkData(tasks) {
  if (!tasks || tasks.length === 0) return null

  const assignees = new Map()
  const collaborations = new Map()

  for (const task of tasks) {
    const assignee = task.assignee || 'Unassigned'
    if (!assignees.has(assignee)) {
      assignees.set(assignee, {
        name: assignee,
        tasks: 0,
        points: 0,
        done: 0,
        blocked: 0,
        inProgress: 0,
        sprints: new Set(),
        types: new Set(),
        labels: new Set(),
      })
    }
    const a = assignees.get(assignee)
    a.tasks++
    a.points += task.storyPoints || 0
    a.sprints.add(task.sprint || 'Unknown')
    a.types.add(task.type || 'Unknown')
    if (task.labels) task.labels.forEach((l) => a.labels.add(l))

    const status = String(task.status || '').toLowerCase()
    if (status.includes('done') || status.includes('closed') || status.includes('resolved')) a.done++
    else if (status.includes('block')) a.blocked++
    else if (status.includes('progress') || status.includes('review') || status.includes('develop')) a.inProgress++
  }

  for (const task of tasks) {
    const assignee = task.assignee || 'Unassigned'
    const sprint = task.sprint || 'Unknown'
    const key = `${sprint}::${assignee}`
    if (!collaborations.has(key)) collaborations.set(key, new Set())
    collaborations.get(key).add(assignee)
  }

  const sprintAssignees = new Map()
  for (const [key, assigneeSet] of collaborations) {
    const [sprint] = key.split('::')
    if (!sprintAssignees.has(sprint)) sprintAssignees.set(sprint, new Set())
    assigneeSet.forEach((a) => sprintAssignees.get(sprint).add(a))
  }

  const linkWeights = new Map()
  for (const assigneeSet of sprintAssignees.values()) {
    const arr = Array.from(assigneeSet)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pair = [arr[i], arr[j]].sort().join('|')
        linkWeights.set(pair, (linkWeights.get(pair) || 0) + 1)
      }
    }
  }

  const nodes = Array.from(assignees.values()).map((a) => ({
    name: a.name,
    tasks: a.tasks,
    points: a.points,
    done: a.done,
    blocked: a.blocked,
    inProgress: a.inProgress,
    sprints: a.sprints.size,
    types: a.types.size,
    isUnassigned: a.name === 'Unassigned',
  }))

  const links = Array.from(linkWeights.entries()).map(([pair, weight]) => {
    const [source, target] = pair.split('|')
    return { source, target, weight }
  })

  const nodeMap = new Map(nodes.map((n) => [n.name, n]))
  for (const link of links) {
    const s = nodeMap.get(link.source)
    const t = nodeMap.get(link.target)
    if (s) s.collaborators = (s.collaborators || 0) + 1
    if (t) t.collaborators = (t.collaborators || 0) + 1
  }

  const maxTasks = Math.max(...nodes.map((n) => n.tasks), 1)
  const maxLinks = Math.max(...links.map((l) => l.weight), 1)

  for (const n of nodes) {
    n.radius = 12 + 28 * (n.tasks / maxTasks)
    n.bottleneckScore = (n.collaborators || 0) / Math.max(nodes.length - 1, 1)
  }

  return { nodes, links }
}

export function getNetworkColors() {
  return {
    done: '#22c55e',
    inProgress: '#3b82f6',
    blocked: '#ef4444',
    todo: '#64748b',
    unassigned: '#94a3b8',
    link: '#94a3b8',
    bottleneck: '#f59e0b',
  }
}