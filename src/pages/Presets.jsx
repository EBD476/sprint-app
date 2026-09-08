import { useState } from 'react'
import { usePresets } from '../store/PresetContext'
import { useI18n } from '../i18n'

export default function Presets() {
  const { presets, addPreset, updatePreset, deletePreset, resetPresets } = usePresets()
  const { t } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState(null)

  const openCreate = () => {
    setEditingId(null)
    setTitle('')
    setPrompt('')
    setError(null)
    setModalOpen(true)
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setTitle(p.title)
    setPrompt(p.prompt)
    setError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setTitle('')
    setPrompt('')
    setError(null)
  }

  const handleSave = () => {
    if (!title.trim() || !prompt.trim()) {
      setError(t('presets.requireError'))
      return
    }
    if (editingId) updatePreset(editingId, title, prompt)
    else addPreset(title, prompt)
    closeModal()
  }

  const handleCreateKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
    if (e.key === 'Escape') closeModal()
  }

  const handleDelete = (p) => {
    if (window.confirm(t('presets.confirmDelete', { title: p.title }))) deletePreset(p.id)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('nav.presets')}</h1>
          <p className="muted">{t('presets.subtitle')}</p>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={resetPresets}>
            {t('presets.reset')}
          </button>
          <button className="btn primary" onClick={openCreate}>
            + {t('presets.add')}
          </button>
        </div>
      </header>

      <div className="panel">
        <h2 className="panel-title">{t('presets.listTitle')}</h2>
        {presets.length === 0 ? (
          <div className="empty-state">
            <p>{t('presets.empty')}</p>
            <button className="btn primary" onClick={openCreate}>
              + {t('presets.add')}
            </button>
          </div>
        ) : (
          <div className="preset-list">
            {presets.map((p) => (
              <div className="preset-item" key={p.id}>
                <div className="preset-info">
                  <div className="preset-title">{p.title}</div>
                  <div className="preset-prompt">{p.prompt}</div>
                </div>
                <div className="preset-actions">
                  <button className="btn ghost" onClick={() => startEdit(p)}>
                    {t('presets.edit')}
                  </button>
                  <button className="btn ghost" onClick={() => handleDelete(p)}>
                    {t('presets.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? t('presets.editTitle') : t('presets.addTitle')}</h2>
              <button className="modal-close" onClick={closeModal} aria-label={t('close.aria')}>
                ×
              </button>
            </div>

            <div className="preset-form" onKeyDown={handleCreateKey}>
              <label>
                {t('presets.titleLabel')}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('presets.titlePlaceholder')}
                  autoFocus
                />
              </label>
              <label>
                {t('presets.promptLabel')}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('presets.promptPlaceholder')}
                  rows={5}
                />
              </label>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="modal-actions">
                <button className="btn ghost" onClick={closeModal}>
                  {t('presets.cancel')}
                </button>
                <button className="btn primary" onClick={handleSave}>
                  {editingId ? t('presets.save') : t('presets.add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}