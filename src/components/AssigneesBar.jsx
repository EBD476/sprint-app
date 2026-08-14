import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { useI18n } from '../i18n'
import { tooltipStyle } from './StatusPie'

export default function AssigneesBar({ data }) {
  const { t } = useI18n()
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--grid)" />
        <XAxis type="number" allowDecimals={false} stroke="var(--axis)" fontSize={12} />
        <YAxis type="category" dataKey="name" width={110} stroke="var(--axis)" fontSize={12} tickFormatter={(v) => (String(v).length > 14 ? String(v).slice(0, 13) + '…' : v)} />
        <Tooltip cursor={{ fill: 'var(--row-hover)' }} contentStyle={tooltipStyle} />
        <Bar dataKey="tasks" name={t('chart.seriesTasks')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
        <Bar dataKey="points" name={t('chart.seriesPoints')} fill="#a78bfa" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
