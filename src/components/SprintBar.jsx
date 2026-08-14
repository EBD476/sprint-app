import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { useI18n } from '../i18n'
import { tooltipStyle } from './StatusPie'

export default function SprintBar({ data }) {
  const { t } = useI18n()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="name" stroke="var(--axis)" fontSize={11} tickFormatter={(v) => (String(v).length > 10 ? String(v).slice(0, 9) + '…' : v)} />
        <YAxis allowDecimals={false} stroke="var(--axis)" fontSize={12} />
        <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
        <Bar dataKey="Total" name={t('chart.total')} fill="#334155" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Done" name={t('chart.done')} fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
