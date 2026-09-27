import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n'

export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword, currentUser } = useAuth()
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('auth.fillAllFields'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }
    const result = changePassword(currentUser.id, newPassword, currentPassword)
    if (result.success) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } else {
      setError(t(result.error))
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t('auth.changePassword')}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t('close.aria')}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              {t('auth.currentPassword')}
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('auth.currentPassword')}
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t('auth.newPassword')}
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.newPassword')}
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t('auth.confirmPassword')}
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPassword')}
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              {t('close.aria')}
            </button>
            <button type="submit" className="btn primary">
              {t('auth.updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
