import { computeStats, classifyStatus } from './stats'

function truncate(str, len) {
  if (str == null) return ''
  return String(str).length > len ? String(str).slice(0, len) + '…' : String(str)
}

function singleLine(str) {
  return String(str || '').replace(/\s+/g, ' ').trim()
}

export function buildDataContext(tasks, stats) {
  if (!tasks || tasks.length === 0) return ''

  const s = stats || computeStats(tasks)

  const lines = []
  lines.push(`# Sprint Data Summary`)
  lines.push(`- Total tasks: ${s.total}`)
  lines.push(`- Status breakdown: Done ${s.done} (${s.completion}%), In Progress ${s.inProgress}, Blocked ${s.blocked}, To Do ${s.todo}`)
  lines.push(`- Story points: ${s.totalPoints} total, ${s.donePoints} completed (${s.pointsCompletion}%)`)
  lines.push(`- Unestimated tasks: ${s.unestimated.length}`)
  if (s.avgCycleTime != null) lines.push(`- Average cycle time (created → resolved): ${s.avgCycleTime} days`)

  if (s.byAssignee.length) {
    lines.push(`\n## Tasks per assignee (tasks / points)`)
    for (const a of s.byAssignee) lines.push(`- ${a.name}: ${a.tasks} tasks / ${a.points} points`)
  }

  if (s.bySprint.length) {
    lines.push(`\n## Sprints`)
    for (const sp of s.bySprint) {
      lines.push(`- ${sp.name}: ${sp.done}/${sp.total} tasks done, ${sp.pointsDone}/${sp.points} points`)
    }
  }

  if (s.byType.length) {
    lines.push(`\n## Issue types`)
    for (const t of s.byType) lines.push(`- ${t.name}: ${t.count}`)
  }

  if (s.blocked > 0) {
    lines.push(`\n## Blocked tasks (${s.blocked})`)
    for (const t of tasks) {
      if (classifyStatus(t.status) === 'blocked') {
        lines.push(`- [${t.key}] "${truncate(t.summary, 80)}" (${t.assignee})`)
      }
    }
  }

  if (s.overdue.length) {
    lines.push(`\n## Overdue tasks (${s.overdue.length})`)
    for (const t of s.overdue) {
      lines.push(`- [${t.key}] "${truncate(t.summary, 80)}" due ${t.dueDate?.slice(0, 10)} (${t.assignee})`)
    }
  }

  lines.push(`\n## All tasks (key | summary | type | status | assignee | points | comment)`)
  for (const t of tasks) {
    lines.push(
      `${t.key} | ${truncate(t.summary, 60)} | ${t.type} | ${t.status} | ${t.assignee} | ${t.storyPoints ?? '-'} | ${t.comment ? `"${truncate(singleLine(t.comment), 200)}"` : '-'}`
    )
  }

  return lines.join('\n')
}

export const SUGGESTED_PROMPTS = [
  'Give a summary of how this sprint went.',
  'What are the biggest risks or blockers?',
  'Who is overloaded and who has capacity?',
  'Which tasks took too long (cycle time analysis)?',
  'What should the team focus on next sprint?',
  'Find anomalies and inconsistencies in the data.',
]
