import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSprint } from '../store/SprintContext'
import { useLlm } from '../store/LlmContext'
import { usePrefs } from '../store/PrefsContext'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n'
import FileUpload from './FileUpload'
import WindowBar from './WindowBar'
import ChangePasswordModal from './ChangePasswordModal'
import { DashboardIcon, CompareIcon, AnalysisIcon, PresetsIcon, DatabaseIcon, AdminIcon, SettingsIcon, KeyIcon, LogoutIcon } from './icons/Icons'

export default function Layout() {
  const { datasets, activeId, setActive, removeDataset, addDataset, openMapping } = useSprint()
  const { apiKey } = useLlm()
  const { openSettings } = usePrefs()
  const { currentUser, logout, hasPermission, isAdmin } = useAuth()
  const { t, n } = useI18n()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleLabel = t(`auth.role${currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1)}`)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-user-top" ref={dropdownRef}>
          <button
            className="user-menu-trigger"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label={t('auth.changePassword')}
          >
            <div className="user-avatar-lg">{currentUser?.name?.charAt(0) || 'U'}</div>
            <div className="user-info-bottom">
              <div className="user-name">{currentUser?.name}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
            <span className={`dropdown-arrow${dropdownOpen ? ' open' : ''}`}>▾</span>
          </button>
          {dropdownOpen && (
            <div className="user-dropdown">
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); openSettings(); }}>
                <SettingsIcon />
                {t('nav.settings')}
              </button>
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); setPasswordModalOpen(true); }}>
                <KeyIcon />
                {t('auth.changePassword')}
              </button>
              <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                <LogoutIcon />
                {t('auth.logout')}
              </button>
            </div>
          )}
          <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
        </div>

        <nav className="nav">
<NavLink
             to="/"
             end
             className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
           >
             <DashboardIcon />
             {t('nav.dashboard')}
           </NavLink>
          {hasPermission('compare') && (
<NavLink
               to="/compare"
               className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
             >
               <CompareIcon />
               {t('nav.compare')}
             </NavLink>
          )}
          {hasPermission('analysis') && (
<NavLink
               to="/analysis"
               className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
             >
               <AnalysisIcon />
               {t('nav.analysis')}
             </NavLink>
          )}
          {hasPermission('presets') && (
<NavLink
               to="/presets"
               className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
             >
               <PresetsIcon />
               {t('nav.presets')}
             </NavLink>
          )}
          {hasPermission('dataSource') && (
<NavLink
               to="/source"
               className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
             >
               <DatabaseIcon />
               {t('nav.dataSource')}
             </NavLink>
          )}
          {hasPermission('admin') && (
<NavLink
               to="/admin"
               className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
             >
               <AdminIcon />
               {t('nav.admin')}
             </NavLink>
          )}
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

        <div className="brand-bottom">
          <span className="brand-dot" />
          <div>
            <div className="brand-name-sm">Sprint Pulse</div>
            <div className="brand-sub">{t('brand.sub')}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <WindowBar />
        <Outlet />
      </main>
    </div>
  )
}
