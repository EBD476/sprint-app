import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { buildReportMarkdown, computeReportData } from '../utils/report'

export default function RetroReport({ tasks, stats, fileName, window }) {
  const { t, n, locale } = useI18n()
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)

  const data = useMemo(() => computeReportData({ tasks, stats }), [tasks, stats])

  const generate = () => {
    if (!data) return
    setReport(buildReportMarkdown(data, { t, n, locale, fileName, window }))
    setCopied(false)
  }

  const copy = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = report
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportMd = () => {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName.replace(/\.[^.]+$/, '') || 'sprint'}-retro.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="report">
      <div className="report-actions">
        <button className="btn primary" onClick={generate}>
          {report ? t('report.regenerate') : t('report.generate')}
        </button>
        {report && (
          <>
            <button className="btn ghost" onClick={copy}>
              {copied ? t('report.copied') : t('report.copy')}
            </button>
            <button className="btn ghost" onClick={exportMd}>
              {t('report.export')}
            </button>
          </>
        )}
      </div>
      {report ? (
        <pre className="report-pre" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          {report}
        </pre>
      ) : (
        <p className="muted">{t('report.empty')}</p>
      )}
    </div>
  )
}
