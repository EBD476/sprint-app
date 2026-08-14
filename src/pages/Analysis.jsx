import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OpenAI from 'openai'
import { useSprint } from '../store/SprintContext'
import { useLlm } from '../store/LlmContext'
import { usePrefs } from '../store/PrefsContext'
import { useI18n } from '../i18n'
import { buildDataContext } from '../utils/llmContext'
import { proxyChat } from '../utils/llmProxy'

const SYSTEM_PROMPT =
  'You are an expert agile coach analyzing a sprint/iteration dataset for a software team. ' +
  'Answer concisely and concretely, referring to the actual data provided. ' +
  'Highlight blockers, risks, bottlenecks, work imbalance, and actionable recommendations. ' +
  'Use bullet points and short paragraphs. Do not invent data that is not present.' + 
  'write result in persian language'


const PROMPT_KEYS = [
  'prompt.summary',
  'prompt.risks',
  'prompt.capacity',
  'prompt.cycle',
  'prompt.focus',
  'prompt.anomalies',
]

export default function Analysis() {
  const { tasks, stats, csvMeta, activeId } = useSprint()
  const { baseUrl, apiKey, model, mode, proxyUrl, proxyToken } = useLlm()
  const { openSettings } = usePrefs()
  const { t, n } = useI18n()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  if (!tasks || !stats) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>{t('nav.analysis')}</h1>
          <p className="muted">{t('analysis.emptySub')}</p>
        </header>
        <div className="empty-state">
          <p>{t('analysis.noData')}</p>
          <Link to="/" className="btn primary">
            {t('analysis.uploadCta')}
          </Link>
        </div>
      </div>
    )
  }

  const dataContext = buildDataContext(tasks, stats)
  const prompts = PROMPT_KEYS.map((k) => t(k))

  const send = async (text) => {
    const prompt = (text ?? input).trim()
    if (!prompt || busy) return
    if (mode !== 'proxy' && !apiKey.trim()) {
      setError(t('analysis.errorNoKey'))
      openSettings('llm')
      return
    }
    setError(null)
    setInput('')
    const history = [...messages, { role: 'user', content: prompt }]
    setMessages(history)
    setBusy(true)

    const messagesForModel = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nDataset (${csvMeta.fileName}):\n${dataContext}` },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ]

    try {
      if (mode === 'proxy') {
        if (!proxyUrl.trim()) {
          setError(t('analysis.errorNoProxy'))
          openSettings('llm')
          return
        }
        await proxyChat({
          url: proxyUrl.trim(),
          token: proxyToken.trim() || undefined,
          model: model.trim(),
          messages: messagesForModel,
          onDelta: (partial) =>
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { role: 'assistant', content: partial }]
              }
              return [...prev, { role: 'assistant', content: partial }]
            }),
        })
      } else {
        const client = new OpenAI({
          apiKey: apiKey.trim(),
          baseURL: baseUrl.trim() || undefined,
          dangerouslyAllowBrowser: true,
        })
        const completion = await client.chat.completions.create({
          model: model.trim(),
          temperature: 0.4,
          messages: messagesForModel,
        })
        const answer = completion.choices?.[0]?.message?.content ?? 'No response.'
        setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
      }
    } catch (err) {
      const detail = err?.error?.message || err?.message || String(err)
      setError(t('analysis.errorFailed', { detail }))
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('nav.analysis')}</h1>
          <p className="muted">
            {csvMeta.fileName} · {n(stats.total)} {t('common.tasks')} · {t('analysis.viaLlm')}
          </p>
        </div>
        <button className="btn ghost" onClick={() => openSettings('llm')}>
          ⚙ {t('nav.llmSettings')}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel chat-panel">
        <div className="chat-scroll">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <h3>{t('analysis.chatTitle')}</h3>
              <p className="muted">{t('analysis.chatHint')}</p>
              <div className="prompt-chips">
                {prompts.map((p) => (
                  <button key={p} className="chip" onClick={() => send(p)} disabled={busy}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="msg-label">{m.role === 'user' ? t('analysis.you') : t('analysis.aiCoach')}</div>
                <div className="msg-body">{m.content}</div>
              </div>
            ))
          )}
          {busy && (
            <div className="msg assistant">
              <div className="msg-label">{t('analysis.aiCoach')}</div>
              <div className="msg-body thinking">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t('analysis.placeholder')}
            disabled={busy}
          />
          <button className="btn primary" onClick={() => send()} disabled={busy || !input.trim()}>
            {t('analysis.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
