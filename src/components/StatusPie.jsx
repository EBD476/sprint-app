import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useI18n } from '../i18n'

const COLORS = {
  done: '#22c55e',
  in_progress: '#3b82f6',
  blocked: '#ef4444',
  todo: '#94a3b8',
}

const LABEL_KEY = {
  done: 'status.done',
  in_progress: 'status.inProgress',
  blocked: 'status.blocked',
  todo: 'status.todo',
}

export default function StatusPie({ data }) {
  const { t } = useI18n()
  const rows = Object.entries(data).map(([cls, d]) => ({
    name: t(LABEL_KEY[cls] || 'status.todo'),
    value: d.count,
    fill: COLORS[cls] || '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={r.fill} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" iconType="circle" iconSize={9} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const tooltipStyle = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
}
