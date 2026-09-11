const MAX_PER_MINUTE = 90
const WINDOW_MS = 60_000

let timestamps = []

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function throttle() {
  const now = Date.now()
  timestamps = timestamps.filter(t => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_PER_MINUTE) {
    const oldest = timestamps[0]
    const waitMs = WINDOW_MS - (now - oldest) + 10
    await wait(waitMs)
  }
  timestamps.push(Date.now())
}

export async function limitedFetch(url, options, { onProgress } = {}) {
  await throttle()
  const res = await fetch(url, options)
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10)
    if (onProgress) onProgress({ phase: 'rate-limited', retryAfter })
    await wait(retryAfter * 1000)
    return limitedFetch(url, options, { onProgress })
  }
  return res
}

export async function paginatedFetch(baseUrl, options, { onProgress, maxResults = 50 } = {}) {
  let startAt = 0
  let allIssues = []
  let total = null

  while (total === null || startAt < total) {
    const sep = baseUrl.includes('?') ? '&' : '?'
    const url = `${baseUrl}${sep}startAt=${startAt}&maxResults=${maxResults}`
    if (onProgress) onProgress({ phase: 'fetching', fetched: startAt, total: total ?? '?' })
    const res = await limitedFetch(url, options, { onProgress })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    const issues = data.issues || data
    allIssues = allIssues.concat(issues)
    total = data.total ?? issues.length
    startAt += issues.length
    if (issues.length === 0) break
  }

  if (onProgress) onProgress({ phase: 'done', fetched: allIssues.length, total: allIssues.length })
  return allIssues
}