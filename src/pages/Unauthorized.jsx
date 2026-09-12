import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n'
import { Link } from 'react-router-dom'

const UnauthorizedIllustration = () => (
  <svg
    viewBox="0 0 200 200"
    width="160"
    height="160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="shieldGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="lockGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="40" fill="url(#shieldGrad)" />
    <path
      d="M50 60 L150 60 L150 140 Q150 160 100 160 Q50 160 50 140 L50 60 Z"
      stroke="url(#lockGrad)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M80 85 L80 70 Q80 58 90 58 L110 58 Q122 58 122 70 L122 85"
      stroke="url(#lockGrad)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="72" y="85" width="56" height="45" rx="4" stroke="url(#lockGrad)" strokeWidth="3" fill="none" />
    <path
      d="M100 100 L100 130"
      stroke="#ef4444"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    <circle cx="100" cy="138" r="4" fill="#ef4444" opacity="0.7" />
    <circle cx="65" cy="45" r="8" fill="#ef4444" fillOpacity="0.2" />
    <circle cx="135" cy="155" r="6" fill="#f97316" fillOpacity="0.2" />
    <circle cx="40" cy="120" r="4" fill="#ef4444" fillOpacity="0.15" />
    <circle cx="160" cy="50" r="5" fill="#f97316" fillOpacity="0.15" />
  </svg>
)

export default function Unauthorized() {
  const { t } = useI18n()
  const { logout, currentUser } = useAuth()

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-illustration">
          <UnauthorizedIllustration />
        </div>
        <h1>{t('auth.unauthorized')}</h1>
        <p className="unauthorized-message">{t('auth.unauthorizedMessage')}</p>
        {currentUser && (
          <p className="unauthorized-user muted">
            {t('auth.loggedInAs', { name: currentUser.name, role: currentUser.role })}
          </p>
        )}
        <div className="unauthorized-actions">
          <Link to="/" className="btn primary">
            {t('auth.goHome')}
          </Link>
          <button className="btn ghost" onClick={logout}>
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}