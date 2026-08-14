import http from 'node:http'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendFile, readFile, writeFile } from 'node:fs/promises'

// Server-side LLM proxy for Sprint Pulse.
//
// The browser never sees the upstream API key: the frontend calls this proxy,
// which injects `LLM_API_KEY` from the server environment, enforces usage
// limits, restricts models, and writes an audit log.
//
// Env vars:
//   PROXY_PORT               port to listen on (default 8787)
//   LLM_API_KEY              upstream API key (required)
//   LLM_BASE_URL             upstream base URL (default https://api.openai.com/v1)
//   PROXY_AUTH_TOKEN         optional bearer token clients must send
//   ALLOWED_MODELS           comma-separated model allowlist (empty = allow all)
//   MAX_REQUESTS_PER_MINUTE  sliding-minute request cap (default 60)
//   MAX_REQUESTS_PER_DAY     daily request cap (default 1000)
//   MAX_BODY_BYTES           max request body size (default 2_000_000)
//   AUDIT_FILE               audit log path (default ./audit.log)
//   STATE_FILE               usage state path (default ./proxy-state.json)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PROXY_PORT || 8787)
const UPSTREAM_BASE = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const UPSTREAM_KEY = process.env.LLM_API_KEY || ''
const AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN || ''
const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const MAX_PER_MINUTE = Number(process.env.MAX_REQUESTS_PER_MINUTE || 60)
const MAX_PER_DAY = Number(process.env.MAX_REQUESTS_PER_DAY || 1000)
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 2_000_000)
const AUDIT_FILE = process.env.AUDIT_FILE || path.join(__dirname, 'audit.log')
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'proxy-state.json')

if (!UPSTREAM_KEY) {
  console.warn('[proxy] warning: LLM_API_KEY is not set — upstream requests will be unauthenticated.')
}

const dayKey = (d) => d.toISOString().slice(0, 10)
const minuteKey = (d) => d.toISOString().slice(0, 16)

let state = { day: dayKey(new Date()), dayCount: 0, minute: minuteKey(new Date()), minuteCount: 0, total: 0 }

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_FILE, 'utf8'))
    state = { ...state, ...parsed }
  } catch {
    // no prior state
  }
}

function persistState() {
  writeFile(STATE_FILE, JSON.stringify(state)).catch(() => {})
}

function rollCounters() {
  const now = new Date()
  const d = dayKey(now)
  const m = minuteKey(now)
  if (d !== state.day) {
    state.day = d
    state.dayCount = 0
  }
  if (m !== state.minute) {
    state.minute = m
    state.minuteCount = 0
  }
}

async function audit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), reqId: crypto.randomUUID(), ...entry })
  try {
    await appendFile(AUDIT_FILE, line + '\n')
  } catch {
    // audit is best-effort
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        req.destroy()
        reject(Object.assign(new Error('Request body too large'), { status: 413 }))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function pipeStream(req, res, body, start, ip, model) {
  const upstream = await fetch(`${UPSTREAM_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${UPSTREAM_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const isStream = (upstream.headers.get('content-type') || '').includes('text/event-stream')

  res.writeHead(upstream.status, {
    'Content-Type': isStream ? 'text/event-stream' : 'application/json',
    'Cache-Control': 'no-cache',
    Connection: isStream ? 'keep-alive' : 'close',
    'Access-Control-Allow-Origin': '*',
  })

  let tokens = null
  try {
    if (!isStream) {
      const data = await upstream.json()
      tokens = data?.usage ?? null
      res.end(JSON.stringify(data))
    } else if (!upstream.body) {
      res.end()
    } else {
      const reader = upstream.body.getReader()
      const acc = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc.push(Buffer.from(value))
        res.write(value)
      }
      const text = Buffer.concat(acc).toString('utf8')
      try {
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('data:') && !l.includes('[DONE]'))
        if (lines.length) {
          const last = JSON.parse(lines[lines.length - 1].slice(5).trim())
          tokens = last?.usage ?? null
        }
      } catch {
        // usage is optional
      }
      res.end()
    }
  } catch (err) {
    res.destroy()
  }

  await audit({
    status: upstream.status,
    ms: Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 10) / 10,
    model,
    stream: isStream,
    tokens,
    ip,
  })
}

const server = http.createServer(async (req, res) => {
  const start = process.hrtime.bigint()
  const url = new URL(req.url, 'http://localhost')
  const ip = req.socket.remoteAddress || ''

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    rollCounters()
    sendJson(res, 200, {
      ok: true,
      limits: { perMinute: MAX_PER_MINUTE, perDay: MAX_PER_DAY },
      state: { dayCount: state.dayCount, minuteCount: state.minuteCount, total: state.total },
    })
    return
  }

  if (req.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
    sendJson(res, 404, { error: { message: 'Not found' } })
    return
  }

  try {
    if (AUTH_TOKEN && (req.headers.authorization || '') !== `Bearer ${AUTH_TOKEN}`) {
      await audit({ status: 401, ip, path: url.pathname, msg: 'auth_failed' })
      sendJson(res, 401, { error: { message: 'Unauthorized' } })
      return
    }

    const raw = await readBody(req)
    let body
    try {
      body = JSON.parse(raw.toString('utf8'))
    } catch {
      throw Object.assign(new Error('Invalid JSON body'), { status: 400 })
    }

    const model = String(body.model || '')
    if (!model) throw Object.assign(new Error('model is required'), { status: 400 })
    if (ALLOWED_MODELS.length && !ALLOWED_MODELS.includes(model)) {
      await audit({ status: 400, ip, model, msg: `model_not_allowed` })
      sendJson(res, 400, { error: { message: `Model "${model}" is not allowed by proxy policy.` } })
      return
    }

    rollCounters()
    if (state.minuteCount >= MAX_PER_MINUTE || state.dayCount >= MAX_PER_DAY) {
      await audit({ status: 429, ip, model, msg: 'rate_limited' })
      const now = new Date()
      const retryAfter = Math.max(
        1,
        state.minuteCount >= MAX_PER_MINUTE
          ? Math.ceil((60 - now.getUTCSeconds()) || 1)
          : 60
      )
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': String(retryAfter),
      })
      res.end(JSON.stringify({ error: { message: 'Rate limit exceeded. Try again later.' } }))
      return
    }

    state.minuteCount++
    state.dayCount++
    state.total++
    persistState()

    await pipeStream(req, res, body, start, ip, model)
  } catch (err) {
    const status = err.status || 500
    await audit({ status, ip, msg: err.message || String(err) })
    sendJson(res, status, {
      error: { message: status === 500 ? 'Proxy error: ' + (err.message || String(err)) : err.message },
    })
  }
})

await loadState()
rollCounters()
server.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`)
  console.log(`[proxy] upstream: ${UPSTREAM_BASE}${ALLOWED_MODELS.length ? ` | allowed: ${ALLOWED_MODELS.join(', ')}` : ''}`)
  console.log(`[proxy] limits: ${MAX_PER_MINUTE}/min, ${MAX_PER_DAY}/day${AUTH_TOKEN ? ' | auth required' : ''}`)
  console.log(`[proxy] audit: ${AUDIT_FILE}`)
})
