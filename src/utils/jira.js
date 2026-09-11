import { limitedFetch, paginatedFetch } from './rateLimit'

const FIELDS = 'summary,status,assignee,issuetype,priority,created,updated,resolutiondate,duedate,storypoints,sprint,timeoriginalestimate,labels,comment'

function authHeader(email, apiToken) {
  return `Basic ${btoa(`${email}:${apiToken}`)}`
}

function base(b) {
  return b.replace(/\/$/, '')
}

function headers(email, apiToken) {
  return {
    'Authorization': authHeader(email, apiToken),
    'Accept': 'application/json'
  }
}

export async function fetchProjects({ baseUrl, email, apiToken }, { onProgress } = {}) {
  if (onProgress) onProgress({ phase: 'fetching', fetched: 0, total: '?' })
  const res = await limitedFetch(`${base(baseUrl)}/rest/api/3/project/search`, {
    headers: headers(email, apiToken)
  }, { onProgress })
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`)
  const data = await res.json()
  if (onProgress) onProgress({ phase: 'done', fetched: 1, total: 1 })
  return data.values || data
}

export async function fetchSprints({ baseUrl, email, apiToken }, projectKey, { onProgress } = {}) {
  if (onProgress) onProgress({ phase: 'fetching', fetched: 0, total: '?' })
  const boardRes = await limitedFetch(`${base(baseUrl)}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`, {
    headers: headers(email, apiToken)
  }, { onProgress })
  if (!boardRes.ok) throw new Error(`Jira Board API error: ${boardRes.status}`)
  const boardData = await boardRes.json()
  const boards = boardData.values || []

  if (boards.length === 0) {
    if (onProgress) onProgress({ phase: 'done', fetched: 0, total: 0 })
    return []
  }

  const sprintRes = await limitedFetch(`${base(baseUrl)}/rest/agile/1.0/board/${boards[0].id}/sprint?state=active,closed,future`, {
    headers: headers(email, apiToken)
  }, { onProgress })
  if (!sprintRes.ok) throw new Error(`Jira Sprint API error: ${sprintRes.status}`)
  const sprintData = await sprintRes.json()
  if (onProgress) onProgress({ phase: 'done', fetched: 1, total: 1 })
  return sprintData.values || []
}

export async function importSprint({ baseUrl, email, apiToken }, sprintId, { onProgress } = {}) {
  const opts = { headers: headers(email, apiToken) }

  const [sprintRes, issues] = await Promise.all([
    limitedFetch(`${base(baseUrl)}/rest/agile/1.0/sprint/${sprintId}`, opts, { onProgress }),
    paginatedFetch(`${base(baseUrl)}/rest/agile/1.0/sprint/${sprintId}/issue?fields=${FIELDS}`, opts, { onProgress, maxResults: 50 })
  ])

  if (!sprintRes.ok) throw new Error(`Jira Sprint API error: ${sprintRes.status}`)
  const sprint = await sprintRes.json()

  const tasks = issues.map(issue => {
    const fields = issue.fields
    const sprintName = fields.sprint ? fields.sprint.map(s => s.name).join(', ') : ''
    const storyPoints = fields.customfield_10016 || fields.customfield_10020 || fields.customfield_10002 || null

    return {
      key: issue.key,
      summary: fields.summary || '',
      type: fields.issuetype?.name || 'Task',
      status: fields.status?.name || 'Unknown',
      priority: fields.priority?.name || '',
      assignee: fields.assignee?.displayName || 'Unassigned',
      reporter: fields.reporter?.displayName || '',
      created: fields.created,
      updated: fields.updated,
      resolved: fields.resolutiondate,
      dueDate: fields.duedate,
      storyPoints: storyPoints ? parseFloat(storyPoints) : null,
      sprint: sprintName,
      timeSpent: fields.timeoriginalestimate ? fields.timeoriginalestimate / 3600 : null,
      labels: fields.labels || [],
      comment: fields.comment?.comments?.[0]?.body || ''
    }
  }).filter(t => t.key || t.summary)

  return {
    tasks,
    headers: ['key', 'summary', 'type', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated', 'resolved', 'dueDate', 'storyPoints', 'sprint', 'timeSpent', 'labels', 'comment'],
    sprintDates: {
      start: sprint.startDate || null,
      end: sprint.endDate || null
    }
  }
}

export function validateConfig({ baseUrl, email, apiToken }) {
  return baseUrl.trim() && email.trim() && apiToken.trim()
}