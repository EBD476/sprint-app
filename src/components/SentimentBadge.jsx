import { useI18n } from '../i18n'
import { analyzeTaskSentiment } from '../utils/sentiment'

const ICONS = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
}

const CLASSES = {
  positive: 'sentiment-positive',
  neutral: 'sentiment-neutral',
  negative: 'sentiment-negative',
}

export default function SentimentBadge({ task, showLabel = false }) {
  const { t } = useI18n()
  const sentiment = analyzeTaskSentiment(task)

  if (!task.comment) return null

  return (
    <span className={`sentiment-badge ${CLASSES[sentiment.label]}`} title={t('sentiment.tooltip', { label: t(`sentiment.${sentiment.label}`) })}>
      <span className="sentiment-icon">{ICONS[sentiment.label]}</span>
      {showLabel && <span className="sentiment-label">{t(`sentiment.${sentiment.label}`)}</span>}
    </span>
  )
}