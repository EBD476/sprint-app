import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSprint } from '../store/SprintContext'
import { useLlm } from '../store/LlmContext'
import { usePrefs } from '../store/PrefsContext'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n'
import FileUpload from './FileUpload'
import WindowBar from './WindowBar'

export default function Layout() {
  const { datasets, activeId, setActive, removeDataset, addDataset, openMapping } = useSprint()
  const { apiKey } = useLlm()
  const { openSettings } = usePrefs()
  const { currentUser, logout, hasPermission, isAdmin } = useAuth()
  const { t, n } = useI18n()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <div className="brand-name">Sprint Pulse</div>
            <div className="brand-sub">{t('brand.sub')}</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {t('nav.dashboard')}
          </NavLink>
          {hasPermission('compare') && (
            <NavLink
              to="/compare"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.compare')}
            </NavLink>
          )}
          {hasPermission('analysis') && (
            <NavLink
              to="/analysis"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.analysis')}
            </NavLink>
          )}
          {hasPermission('presets') && (
            <NavLink
              to="/presets"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.presets')}
            </NavLink>
          )}
          {hasPermission('dataSource') && (
            <NavLink
              to="/source"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.dataSource')}
            </NavLink>
          )}
          {hasPermission('admin') && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.admin')}
            </NavLink>
          )}
          <button className={`nav-link nav-action${apiKey ? '' : ' warning'}`} onClick={() => openSettings()}>
            ⚙ {t('nav.settings')}
          </button>
        </nav>

        <div className="sidebar-datasets">
          <div className="sidebar-section-title">{t('datasets.title')}</div>
          {datasets.length === 0 ? (
            <div className="file-chip empty">{t('datasets.empty')}</div>
          ) : (
            datasets.map((d) => (
              <div
                key={d.id}
                className={`dataset-item${d.id === activeId ? ' active' : ''}`}
                onClick={() => setActive(d.id)}
                title={d.fileName}
              >
                <div className="dataset-info">
                  <span className="dataset-name">{d.label}</span>
                  <span className="dataset-meta">{t('datasets.tasks', { count: n(d.tasks.length) })}</span>
                </div>
                <button
                  className="dataset-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDataset(d.id)
                  }}
                  aria-label={`${t('common.all')} ${d.label}`}
                >
                  ×
                </button>
              </div>
            ))
          )}
          <FileUpload
            button={t('datasets.import')}
            onParsed={(metaTasks, meta) => addDataset({ ...meta, tasks: metaTasks })}
            onNeedsMapping={(payload) => openMapping({ ...payload, mode: 'add' })}
          />
        </div>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{currentUser?.name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{currentUser?.name}</div>
              <div className="user-role">{t(`auth.role${currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1)}`)}</div>
            </div>
          </div>
          <button className="btn ghost user-logout" onClick={handleLogout}>
            {t('auth.logout')}
          </button>
        </div>
      </aside>

      <main className="main">
        <WindowBar />
        <Outlet />
      </main>
    </div>
  )
}
