import { NavLink, Outlet } from 'react-router-dom'
import { useSprint } from '../store/SprintContext'
import { useLlm } from '../store/LlmContext'
import { usePrefs } from '../store/PrefsContext'
import { useI18n } from '../i18n'
import FileUpload from './FileUpload'
import WindowBar from './WindowBar'

export default function Layout() {
  const { datasets, activeId, setActive, removeDataset, addDataset, openMapping } = useSprint()
  const { apiKey } = useLlm()
  const { openSettings } = usePrefs()
  const { t, n } = useI18n()

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
          <NavLink
            to="/compare"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {t('nav.compare')}
          </NavLink>
          <NavLink
            to="/analysis"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {t('nav.analysis')}
          </NavLink>
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
      </aside>

      <main className="main">
        <WindowBar />
        <Outlet />
      </main>
    </div>
  )
}
