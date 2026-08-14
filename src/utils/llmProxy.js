export async function proxyChat({ url, token, model, messages, onDelta }) {
  const controller = new AbortController()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model, stream: true, temperature: 0.4, messages }),
    signal: controller.signal,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const data = await res.json()
      detail = data?.error?.message || detail
    } catch {
      // non-JSON error body
    }
    const err = new Error(detail)
    err.status = res.status
    throw err
  }

  if (!res.body) {
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return full
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onDelta?.(full)
        }
      } catch {
        // ignore keep-alive / malformed chunks
      }
    }
  }

  return full
}
