import { useCallback, useRef, useState } from 'react'
import { parseCsvRows, detectColumnMap, buildTasks } from '../utils/csv'
import { useI18n } from '../i18n'

export default function FileUpload({ onParsed, onNeedsMapping, compact, button }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const { t } = useI18n()

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      setError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const { headers, rows } = parseCsvRows(String(e.target.result))
          const columnMap = detectColumnMap(headers)
          if (columnMap.summary || columnMap.key) {
            const tasks = buildTasks(rows, columnMap)
            onParsed(tasks, { fileName: file.name, headers, columnMap, rows })
          } else {
            onNeedsMapping({ fileName: file.name, headers, rows, columnMap })
          }
        } catch (err) {
          setError(err.message)
        }
      }
      reader.onerror = () => setError(t('upload.readError'))
      reader.readAsText(file)
    },
    [onParsed, onNeedsMapping, t]
  )

  const dropProps = {
    onClick: () => inputRef.current?.click(),
    onDragOver: (e) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e) => {
      e.preventDefault()
      setDragOver(false)
      handleFile(e.dataTransfer.files[0])
    },
  }

  const inputProps = {
    ref: inputRef,
    type: 'file',
    accept: '.csv,text/csv',
    hidden: true,
    onChange: (e) => handleFile(e.target.files[0]),
  }

  if (button) {
    return (
      <div className="sidebar-add">
        <input {...inputProps} />
        <button type="button" className="btn primary" onClick={() => inputRef.current?.click()}>
          + {button}
        </button>
        {error && <div className="upload-error">{error}</div>}
      </div>
    )
  }

  if (compact) {
    return (
      <div className="upload upload-compact" {...dropProps}>
        <input {...inputProps} />
        <span>📄 {t('upload.addCsv')}</span>
        {error && <span className="upload-error">{error}</span>}
      </div>
    )
  }

  return (
    <div className={`upload${dragOver ? ' drag-over' : ''}`} {...dropProps}>
      <input {...inputProps} />
      <div className="upload-icon">📄</div>
      <div className="upload-title">{t('upload.dropTitle')}</div>
      <div className="upload-sub">{t('upload.browseSub')}</div>
      {error && <div className="upload-error">{error}</div>}
    </div>
  )
}
