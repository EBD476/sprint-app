import Papa from 'papaparse'

const ALIASES = {
  key: ['issue id', 'issue key', 'key', 'id'],
  summary: ['issue summary', 'summary', 'title', 'name', 'task'],
  type: ['type', 'issue type', 'task type', 'kind'],
  status: ['status', 'state', 'current status', 'workflow status'],
  priority: ['priority', 'severity'],
  assignee: ['author', 'assignee', 'assignee display name', 'assigned to', 'owner', 'assignees'],
  reporter: ['reporter', 'created by'],
  created: ['date', 'created', 'creation date', 'created date'],
  updated: ['updated', 'updated date'],
  resolved: ['resolved', 'resolution date', 'resolved date', 'done date'],
  dueDate: ['due date', 'due', 'deadline'],
  storyPoints: ['estimation', 'story points', 'points', 'estimate', 'original estimate'],
  sprint: ['sprint', 'sprint name', 'iteration'],
  timeSpent: ['spent time', 'time spent', 'spent', 'timespent', 'time spent (hours)'],
  labels: ['labels', 'tags', 'components'],
  comment: ['comment', 'comments', 'description', 'notes', 'remark'],
}

const FIELD_ALIASES = Object.keys(ALIASES)

function normalizeKey(raw) {
  return String(raw || '').trim().toLowerCase()
}

function findColumn(header, aliases) {
  const norm = normalizeKey(header)
  return aliases.some((a) => norm === a || norm.replace(/[^a-z]/g, '') === a.replace(/[^a-z]/g, ''))
}

function parseNumber(value) {
  if (value == null) return null
  const str = String(value).trim().replace(/[,%]/g, '')
  if (str === '') return null
  const num = Number(str)
  return Number.isFinite(num) ? num : null
}

function parseDate(value) {
  if (!value) return null
  const str = String(value).trim()
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function normalizeRow(rawRow, columnMap) {
  const pick = (field) => {
    const col = columnMap[field]
    return col ? rawRow[col] : undefined
  }

  const task = {
    key: String(pick('key') ?? '').trim(),
    summary: String(pick('summary') ?? '').trim(),
    type: String(pick('type') ?? 'Task').trim() || 'Task',
    status: String(pick('status') ?? '').trim() || 'Unknown',
    priority: String(pick('priority') ?? '').trim(),
    assignee: String(pick('assignee') ?? 'Unassigned').trim() || 'Unassigned',
    reporter: String(pick('reporter') ?? '').trim(),
    created: parseDate(pick('created')),
    updated: parseDate(pick('updated')),
    resolved: parseDate(pick('resolved')),
    dueDate: parseDate(pick('dueDate')),
    storyPoints: parseNumber(pick('storyPoints')),
    sprint: String(pick('sprint') ?? '').trim(),
    timeSpent: parseNumber(pick('timeSpent')),
    labels: String(pick('labels') ?? '')
      .split(/[,;|]/)
      .map((l) => l.trim())
      .filter(Boolean),
    comment: String(pick('comment') ?? '').trim(),
  }

  task.raw = { ...rawRow }
  return task
}

export function parseCsvRows(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type === 'Delimiter')
    if (fatal.length > 0) throw new Error(`Could not parse file: ${fatal[0].message}`)
  }

  const headers = result.meta.fields || []
  const rows = result.data.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== '')
  )

  return { headers, rows }
}

export function detectColumnMap(headers) {
  const columnMap = {}
  for (const header of headers) {
    for (const field of FIELD_ALIASES) {
      if (findColumn(header, ALIASES[field]) && !columnMap[field]) {
        columnMap[field] = header
      }
    }
  }
  return columnMap
}

export function buildTasks(rows, columnMap) {
  const mappedHeaders = Object.values(columnMap)
  if (mappedHeaders.length === 0) {
    throw new Error(
      'No columns mapped. Expected a sprint export with columns like "Issue Summary", "Date", "Author", "Type", "Spent Time".'
    )
  }

  const tasks = rows
    .map((row) => normalizeRow(row, columnMap))
    .filter((t) => t.key || t.summary)

  if (tasks.length === 0) {
    throw new Error('No task rows found in the file.')
  }

  return tasks
}
