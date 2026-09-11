import { limitedFetch } from './rateLimit'

function base(b) {
  return b.replace(/\/$/, '')
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
}

export async function fetchProjects({ baseUrl, token }, { onProgress } = {}) {
  if (onProgress) onProgress({ phase: 'fetching', fetched: 0, total: '?' })
  const res = await limitedFetch(`${base(baseUrl)}/api/admin/projects?fields=id,name,shortName`, {
    headers: headers(token)
  }, { onProgress })
  if (!res.ok) throw new Error(`YouTrack API error: ${res.status}`)
  if (onProgress) onProgress({ phase: 'done', fetched: 1, total: 1 })
  return await res.json()
}

export async function fetchSprints({ baseUrl, token }, projectId, { onProgress } = {}) {
  if (onProgress) onProgress({ phase: 'fetching', fetched: 0, total: '?' })
  const res = await limitedFetch(`${base(baseUrl)}/api/issues?query=project:${projectId}%20has:%20sprint&fields=id,summary,sprint,name,start,finish,archived`, {
    headers: headers(token)
  }, { onProgress })
  if (!res.ok) throw new Error(`YouTrack Sprint API error: ${res.status}`)
  const data = await res.json()
  if (onProgress) onProgress({ phase: 'done', fetched: 1, total: 1 })
  return [...new Map(data.map(i => [i.sprint?.name, i.sprint]).filter(([k]) => k)).values()]
}

export async function importSprint({ baseUrl, token }, sprintName, sprintDates, { onProgress } = {}) {
  if (onProgress) onProgress({ phase: 'fetching', fetched: 0, total: '?' })
  const res = await limitedFetch(`${base(baseUrl)}/api/issues?query=sprint:${encodeURIComponent(sprintName)}&fields=id,summary,project,type,state,assignee,reporter,created,updated,resolved,dueDate,customFields(name,value),timeSpent,tags(name),comments(text)`, {
    headers: headers(token)
  }, { onProgress })
  if (!res.ok) throw new Error(`YouTrack Issues API error: ${res.status}`)
  const data = await res.json()
  if (onProgress) onProgress({ phase: 'done', fetched: data.length, total: data.length })

  const tasks = data.map(issue => {
    const customFields = {}
    issue.customFields?.forEach(f => { customFields[f.name] = f.value })

    return {
      key: issue.idReadable || issue.id,
      summary: issue.summary || '',
      type: issue.$type?.replace('Issue', '') || 'Task',
      status: issue.state?.name || issue.state?.localizedName || 'Unknown',
      priority: customFields.Priority?.name || customFields.Priority || '',
      assignee: issue.assignee?.fullName || issue.assignee?.name || 'Unassigned',
      reporter: issue.reporter?.fullName || issue.reporter?.name || '',
      created: issue.created ? new Date(issue.created).toISOString() : null,
      updated: issue.updated ? new Date(issue.updated).toISOString() : null,
      resolved: issue.resolved ? new Date(issue.resolved).toISOString() : null,
      dueDate: customFields['Due Date']?.value ? new Date(customFields['Due Date'].value).toISOString() : null,
      storyPoints: customFields['Story Points']?.value || customFields['Story points']?.value || null,
      sprint: sprintName,
      timeSpent: issue.timeSpent ? issue.timeSpent / 3600 / 1000 : null,
      labels: issue.tags?.map(t => t.name) || [],
      comment: issue.comments?.[0]?.text || ''
    }
  }).filter(t => t.key || t.summary)

  return {
    tasks,
    headers: ['key', 'summary', 'type', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated', 'resolved', 'dueDate', 'storyPoints', 'sprint', 'timeSpent', 'labels', 'comment'],
    sprintDates: sprintDates || { start: null, end: null }
  }
}

export function validateConfig({ baseUrl, token }) {
  return baseUrl.trim() && token.trim()
}