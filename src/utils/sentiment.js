const POSITIVE = [
  'done', 'completed', 'finished', 'shipped', 'released', 'merged', 'deployed',
  'works', 'working', 'fixed', 'resolved', 'approved', 'ready', 'good', 'great',
  'excellent', 'perfect', 'nice', 'awesome', 'love', 'happy', 'thanks', 'thank',
  'appreciate', 'helpful', 'smooth', 'easy', 'fast', 'quick', 'success',
  'on track', 'looking good', 'well done', 'brilliant', 'fantastic', 'solved',
  'passing', 'green', 'verified', 'confirmed', 'accepted', 'delivered'
]

const NEGATIVE = [
  'blocked', 'stuck', 'waiting', 'delayed', 'late', 'behind', 'missed',
  'failed', 'broken', 'error', 'bug', 'issue', 'problem', 'fail', 'failing',
  'crash', 'crashes', 'urgent', 'critical', 'emergency', 'panic', 'worried',
  'concern', 'risk', 'danger', 'threat', 'deadline', 'overdue', 'past due',
  'not working', 'doesn\'t work', 'won\'t work', 'cannot', 'can\'t', 'unable',
  'impossible', 'struggling', 'difficult', 'hard', 'complicated', 'complex',
  'unclear', 'confused', 'confusing', 'misunderstanding', 'rework', 'redo',
  'regression', 'degraded', 'slower', 'slow', 'performance', 'timeout',
  'refactor', 'tech debt', 'hack', 'workaround', 'kludge', 'frustrated',
  'annoyed', 'disappointed', 'unfortunately', 'sadly', 'problematic',
  'needs discussion', 'disagree', '反对', 'blocked', 'مسدود', 'مشکل', 'باگ'
]

const STRONG_NEGATIVE = [
  'critical blocker', 'show stopper', 'showstopper', 'p0', 'p1',
  'data loss', 'security', 'vulnerability', 'exploit', 'breach',
  'complete failure', 'total failure', 'everything broken', 'all broken',
  'need immediate', 'urgent fix', 'asap', 'emergency', 'hotfix'
]

const INTENSIFIERS = [
  'very', 'extremely', 'highly', 'incredibly', 'absolutely',
  'totally', 'completely', 'utterly', 'really', 'seriously'
]

const NEGATORS = [
  'not', 'no', 'never', 'neither', 'nor', 'hardly', 'barely',
  'doesn\'t', 'don\'t', 'didn\'t', 'wasn\'t', 'weren\'t', 'isn\'t',
  'can\'t', 'cannot', 'won\'t', 'wouldn\'t', 'shouldn\'t'
]

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function countMatches(text, words) {
  let count = 0
  for (const word of words) {
    if (text.includes(word)) count++
  }
  return count
}

function hasNegatorBefore(text, word) {
  const idx = text.indexOf(word)
  if (idx <= 0) return false
  const before = text.slice(Math.max(0, idx - 30), idx)
  return NEGATORS.some(n => before.includes(n))
}

export function analyzeSentiment(text) {
  if (!text) return { score: 0, label: 'neutral', confidence: 0 }

  const normalized = normalize(text)
  const words = normalized.split(' ')

  let positive = 0
  let negative = 0

  for (const word of POSITIVE) {
    if (normalized.includes(word)) {
      if (!hasNegatorBefore(normalized, word)) {
        positive += 1
      } else {
        negative += 0.5
      }
    }
  }

  for (const word of NEGATIVE) {
    if (normalized.includes(word)) {
      if (!hasNegatorBefore(normalized, word)) {
        negative += 1
      } else {
        positive += 0.3
      }
    }
  }

  for (const phrase of STRONG_NEGATIVE) {
    if (normalized.includes(phrase)) {
      negative += 2
    }
  }

  for (const intensifier of INTENSIFIERS) {
    if (normalized.includes(intensifier)) {
      if (positive > negative) positive *= 1.3
      else if (negative > positive) negative *= 1.3
    }
  }

  const total = positive + negative
  const raw = total === 0 ? 0 : (positive - negative) / total
  const score = Math.max(-1, Math.min(1, raw))
  const confidence = Math.min(1, total / 5)

  let label = 'neutral'
  if (score > 0.2) label = 'positive'
  else if (score < -0.2) label = 'negative'

  return { score, label, confidence }
}

export function analyzeTaskSentiment(task) {
  const texts = []
  if (task.comment) texts.push(task.comment)
  if (task.summary) texts.push(task.summary)
  if (task.labels?.length) texts.push(task.labels.join(' '))

  const combined = texts.join(' ')
  return analyzeSentiment(combined)
}

export function analyzeSentimentTrend(tasks) {
  if (!tasks || tasks.length === 0) return []

  return tasks
    .filter(t => t.comment)
    .map(task => ({
      key: task.key,
      summary: task.summary,
      sentiment: analyzeTaskSentiment(task),
      comment: task.comment,
      updated: task.updated,
    }))
    .sort((a, b) => (a.sentiment.score - b.sentiment.score))
}

export function findDecliningConfidence(tasks) {
  if (!tasks || tasks.length === 0) return []

  const withComments = tasks.filter(t => t.comment)
  if (withComments.length < 2) return []

  const declining = []

  for (const task of withComments) {
    const sentiment = analyzeTaskSentiment(task)
    const isBlocked = /block|impede|waiting|stuck/i.test(task.status || '')
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
    const isStale = task.created && (Date.now() - new Date(task.created).getTime()) > 14 * 86400000

    if (sentiment.label === 'negative' && sentiment.confidence > 0.3) {
      declining.push({
        key: task.key,
        summary: task.summary,
        reason: 'negative_sentiment',
        sentiment,
        severity: isBlocked ? 'high' : isOverdue ? 'high' : isStale ? 'medium' : 'low',
      })
    } else if (isBlocked || isOverdue) {
      declining.push({
        key: task.key,
        summary: task.summary,
        reason: isBlocked ? 'blocked' : 'overdue',
        sentiment,
        severity: 'high',
      })
    }
  }

  return declining.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.severity] || 2) - (order[b.severity] || 2)
  })
}

export function getTeamSentimentOverview(tasks) {
  if (!tasks || tasks.length === 0) {
    return { positive: 0, negative: 0, neutral: 0, avgScore: 0, trend: 'stable' }
  }

  const sentiments = tasks
    .filter(t => t.comment)
    .map(t => analyzeTaskSentiment(t))

  if (sentiments.length === 0) {
    return { positive: 0, negative: 0, neutral: 0, avgScore: 0, trend: 'stable' }
  }

  const positive = sentiments.filter(s => s.label === 'positive').length
  const negative = sentiments.filter(s => s.label === 'negative').length
  const neutral = sentiments.length - positive - negative
  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length

  const recentTasks = tasks
    .filter(t => t.comment && t.updated)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
    .slice(0, Math.ceil(tasks.length / 3))

  const oldTasks = tasks
    .filter(t => t.comment && t.updated)
    .sort((a, b) => new Date(a.updated) - new Date(b.updated))
    .slice(0, Math.ceil(tasks.length / 3))

  const recentAvg = recentTasks.length
    ? recentTasks.reduce((sum, t) => sum + analyzeTaskSentiment(t).score, 0) / recentTasks.length
    : avgScore

  const oldAvg = oldTasks.length
    ? oldTasks.reduce((sum, t) => sum + analyzeTaskSentiment(t).score, 0) / oldTasks.length
    : avgScore

  let trend = 'stable'
  if (recentAvg - oldAvg > 0.15) trend = 'improving'
  else if (oldAvg - recentAvg > 0.15) trend = 'declining'

  return { positive, negative, neutral, avgScore, trend }
}