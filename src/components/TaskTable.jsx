import { useEffect, useMemo, useState } from 'react'
import { classifyStatus } from '../utils/stats'
import { useI18n } from '../i18n'
import TaskDrawer from './TaskDrawer'

const COLUMNS = [
  { key: 'key', label: 'table.col.key' },
  { key: 'summary', label: 'table.col.summary' },
  { key: 'type', label: 'table.col.type' },
  { key: 'status', label: 'table.col.status' },
  { key: 'assignee', label: 'table.col.assignee' },
  { key: 'storyPoints', label: 'table.col.points' },
  { key: 'dueDate', label: 'table.col.due' },
]

export default function TaskTable({ tasks }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'key', dir: 1 })
  const [selected, setSelected] = useState(null)
  const { t, n } = useI18n()
  const unassigned = t('status.unassigned')

  useEffect(() => {
    setSelected(null)
  }, [tasks])

  const assignees = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.assignee || unassigned))).sort(),
    [tasks, unassigned]
  )

  const rows = useMemo(() => {
    let list = tasks
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((task) =>
        [task.key, task.summary, task.assignee, task.type, task.status, task.comment, (task.labels || []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((task) => classifyStatus(task.status) === statusFilter)
    }
    if (assigneeFilter !== 'all') {
      list = list.filter((task) => (task.assignee || unassigned) === assigneeFilter)
    }
    const { key, dir } = sort
    return [...list].sort((a, b) => {
      const va = a[key]
      const vb = b[key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [tasks, query, statusFilter, assigneeFilter, sort, unassigned])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))

  return (
    <div className="task-table">
      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder={t('table.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t('table.allStatuses')}</option>
          <option value="done">{t('status.done')}</option>
          <option value="in_progress">{t('status.inProgress')}</option>
          <option value="blocked">{t('status.blocked')}</option>
          <option value="todo">{t('status.todo')}</option>
        </select>
        <select className="filter-select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="all">{t('table.allAssignees')}</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="table-count">{t('table.count', { count: n(rows.length) })}</span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className={sort.key === c.key ? 'sorted' : ''}>
                  {t(c.label)}
                  {sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((task, i) => (
              <tr
                key={task.key || i}
                className={selected === task ? 'selected-row' : ''}
                tabIndex={0}
                onClick={() => setSelected(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelected(task)
                  }
                }}
              >
                <td className="mono">{task.key}</td>
                <td title={task.summary}>{task.summary}</td>
                <td>{task.type}</td>
                <td>
                  <span className={`status-badge status-${classifyStatus(task.status)}`}>{task.status}</span>
                </td>
                <td>{task.assignee || unassigned}</td>
                <td>{task.storyPoints ?? '—'}</td>
                <td>{task.dueDate ? task.dueDate.slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="table-empty">{t('table.empty')}</div>}
      </div>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
