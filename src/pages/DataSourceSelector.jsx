import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import FileUpload from '../components/FileUpload'
import { useSprint } from '../store/SprintContext'
import * as jira from '../utils/jira'
import * as youtrack from '../utils/youtrack'

const JIRA_STORAGE_KEY = 'sprint-pulse-jira-config'
const YOUTRACK_STORAGE_KEY = 'sprint-pulse-youtrack-config'

function loadJiraConfig() {
  try {
    const raw = localStorage.getItem(JIRA_STORAGE_KEY)
    if (!raw) return { baseUrl: '', email: '', apiToken: '' }
    const parsed = JSON.parse(raw)
    return { baseUrl: parsed.baseUrl || '', email: parsed.email || '', apiToken: '' }
  } catch {
    return { baseUrl: '', email: '', apiToken: '' }
  }
}

function loadYouTrackConfig() {
  try {
    const raw = localStorage.getItem(YOUTRACK_STORAGE_KEY)
    if (!raw) return { baseUrl: '', token: '' }
    const parsed = JSON.parse(raw)
    return { baseUrl: parsed.baseUrl || '', token: '' }
  } catch {
    return { baseUrl: '', token: '' }
  }
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-key" />
      <div className="skeleton skeleton-name" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="skeleton-row">
      <div className="skeleton skeleton-row-name" />
      <div className="skeleton skeleton-row-state" />
      <div className="skeleton skeleton-row-dates" />
    </div>
  )
}

function ProgressBar({ progress }) {
  if (!progress) return null
  const { phase, fetched, total, retryAfter } = progress
  const pct = typeof total === 'number' && total > 0 ? Math.round((fetched / total) * 100) : null

  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar">
        <div className="progress-bar-fill" style={pct != null ? { width: `${pct}%` } : { className: 'indeterminate' }} />
      </div>
      <div className="progress-bar-label">
        {phase === 'rate-limited' ? (
          <span className="progress-rate-limited">Rate limited — retrying in {retryAfter}s…</span>
        ) : phase === 'done' ? (
          <span>Fetched {fetched} issues</span>
        ) : pct != null ? (
          <span>Fetched {fetched} / {total} issues ({pct}%)</span>
        ) : (
          <span>Fetching…</span>
        )}
      </div>
    </div>
  )
}

export default function DataSourceSelector() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { datasets, addDataset, openMapping } = useSprint()
  const [activeTab, setActiveTab] = useState('csv')
  const [jiraConfig, setJiraConfig] = useState(loadJiraConfig)
  const [youtrackConfig, setYouTrackConfig] = useState(loadYouTrackConfig)
  const [jiraProjects, setJiraProjects] = useState([])
  const [youtrackProjects, setYouTrackProjects] = useState([])
  const [selectedJiraProject, setSelectedJiraProject] = useState('')
  const [selectedYouTrackProject, setSelectedYouTrackProject] = useState('')
  const [jiraSprints, setJiraSprints] = useState([])
  const [youtrackSprints, setYouTrackSprints] = useState([])
  const [selectedJiraSprint, setSelectedJiraSprint] = useState('')
  const [selectedYouTrackSprint, setSelectedYouTrackSprint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('config')
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify({ baseUrl: jiraConfig.baseUrl, email: jiraConfig.email }))
    } catch {}
  }, [jiraConfig.baseUrl, jiraConfig.email])

  useEffect(() => {
    try {
      localStorage.setItem(YOUTRACK_STORAGE_KEY, JSON.stringify({ baseUrl: youtrackConfig.baseUrl }))
    } catch {}
  }, [youtrackConfig.baseUrl])

  const handleFileUpload = (tasks, meta) => {
    addDataset({ ...meta, tasks })
    navigate('/')
  }

  const handleNeedsMapping = (payload) => {
    openMapping({ ...payload, mode: 'add' })
  }

  const run = async (fn) => {
    setLoading(true)
    setError(null)
    setProgress(null)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const fetchJiraProjects = () => {
    if (!jira.validateConfig(jiraConfig)) return
    run(async () => {
      setJiraProjects(await jira.fetchProjects(jiraConfig, { onProgress: setProgress }))
      setStep('project')
    })
  }

  const fetchJiraSprints = (projectKey) => {
    setSelectedJiraProject(projectKey)
    run(async () => {
      setJiraSprints(await jira.fetchSprints(jiraConfig, projectKey, { onProgress: setProgress }))
      setStep('sprint')
    })
  }

  const importJiraSprint = (sprintId) => {
    setSelectedJiraSprint(sprintId)
    run(async () => {
      const { tasks, headers, sprintDates } = await jira.importSprint(jiraConfig, sprintId, { onProgress: setProgress })
      addDataset({ fileName: `Jira Sprint ${sprintId}`, headers, columnMap: {}, rows: tasks, tasks, sprintDates })
      navigate('/')
    })
  }

  const fetchYouTrackProjects = () => {
    if (!youtrack.validateConfig(youtrackConfig)) return
    run(async () => {
      setYouTrackProjects(await youtrack.fetchProjects(youtrackConfig, { onProgress: setProgress }))
      setStep('project')
    })
  }

  const fetchYouTrackSprints = (projectId) => {
    setSelectedYouTrackProject(projectId)
    run(async () => {
      setYouTrackSprints(await youtrack.fetchSprints(youtrackConfig, projectId, { onProgress: setProgress }))
      setStep('sprint')
    })
  }

  const importYouTrackSprint = (sprintName) => {
    setSelectedYouTrackSprint(sprintName)
    const sprint = youtrackSprints.find(s => s.name === sprintName)
    run(async () => {
      const { tasks, headers, sprintDates } = await youtrack.importSprint(youtrackConfig, sprintName, {
        start: sprint?.start || null,
        end: sprint?.finish || null
      }, { onProgress: setProgress })
      addDataset({ fileName: `YouTrack Sprint ${sprintName}`, headers, columnMap: {}, rows: tasks, tasks, sprintDates })
      navigate('/')
    })
  }

  const renderCsvTab = () => (
    <div className="data-source-tab">
      <FileUpload
        onParsed={handleFileUpload}
        onNeedsMapping={handleNeedsMapping}
      />
      <div className="hint-grid">
        <div className="hint-card">
          <h3>{t('dataSource.csv.howItWorks')}</h3>
          <p>{t('dataSource.csv.howItWorksBody')}</p>
        </div>
        <div className="hint-card">
          <h3>{t('dataSource.csv.supportedTools')}</h3>
          <p>{t('dataSource.csv.supportedToolsBody')}</p>
        </div>
      </div>
    </div>
  )

  const renderJiraTab = () => (
    <div className="data-source-tab">
      {step === 'config' && (
        <div className="config-form">
          <h3>{t('dataSource.jira.connect')}</h3>
          <p className="muted">{t('dataSource.jira.connectBody')}</p>
          <div className="form-group">
            <label>{t('dataSource.jira.baseUrl')}</label>
            <input
              type="url"
              placeholder="https://your-domain.atlassian.net"
              value={jiraConfig.baseUrl}
              onChange={e => setJiraConfig({...jiraConfig, baseUrl: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('dataSource.jira.email')}</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={jiraConfig.email}
              onChange={e => setJiraConfig({...jiraConfig, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('dataSource.jira.apiToken')}</label>
            <input
              type="password"
              placeholder={t('dataSource.jira.apiTokenPlaceholder')}
              value={jiraConfig.apiToken}
              onChange={e => setJiraConfig({...jiraConfig, apiToken: e.target.value})}
              required
            />
            <p className="form-hint">{t('dataSource.jira.apiTokenHint')}</p>
          </div>
          <button className="btn primary" onClick={fetchJiraProjects} disabled={loading || !jira.validateConfig(jiraConfig)}>
            {loading ? t('common.loading') : t('dataSource.jira.connectBtn')}
          </button>
        </div>
      )}
      {step === 'project' && (
        <div className="selection-step">
          <button className="btn ghost back-btn" onClick={() => setStep('config')}>
            ← {t('common.back')}
          </button>
          <h3>{t('dataSource.jira.selectProject')}</h3>
          {loading ? (
            <div className="project-grid">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : jiraProjects.length === 0 ? (
            <p className="muted">{t('dataSource.jira.noProjects')}</p>
          ) : (
            <div className="project-grid">
              {jiraProjects.map(p => (
                <button
                  key={p.key || p.id}
                  className={`project-card${selectedJiraProject === (p.key || p.id) ? ' selected' : ''}`}
                  onClick={() => fetchJiraSprints(p.key || p.id)}
                >
                  <span className="project-key">{p.key || p.id}</span>
                  <span className="project-name">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {step === 'sprint' && (
        <div className="selection-step">
          <button className="btn ghost back-btn" onClick={() => setStep('project')}>
            ← {t('common.back')}
          </button>
          <h3>{t('dataSource.jira.selectSprint')}</h3>
          {loading ? (
            <div className="sprint-list">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : jiraSprints.length === 0 ? (
            <p className="muted">{t('dataSource.jira.noSprints')}</p>
          ) : (
            <div className="sprint-list">
              {jiraSprints.map(s => (
                <button
                  key={s.id}
                  className={`sprint-item${selectedJiraSprint === s.id ? ' selected' : ''}`}
                  onClick={() => importJiraSprint(s.id)}
                  disabled={loading}
                >
                  <span className="sprint-name">{s.name}</span>
                  <span className="sprint-state">{s.state}</span>
                  {s.startDate && <span className="sprint-dates">{new Date(s.startDate).toLocaleDateString()} - {s.endDate ? new Date(s.endDate).toLocaleDateString() : t('dataSource.jira.ongoing')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
    </div>
  )

  const renderYouTrackTab = () => (
    <div className="data-source-tab">
      {step === 'config' && (
        <div className="config-form">
          <h3>{t('dataSource.youtrack.connect')}</h3>
          <p className="muted">{t('dataSource.youtrack.connectBody')}</p>
          <div className="form-group">
            <label>{t('dataSource.youtrack.baseUrl')}</label>
            <input
              type="url"
              placeholder="https://your-instance.youtrack.cloud"
              value={youtrackConfig.baseUrl}
              onChange={e => setYouTrackConfig({...youtrackConfig, baseUrl: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('dataSource.youtrack.token')}</label>
            <input
              type="password"
              placeholder={t('dataSource.youtrack.tokenPlaceholder')}
              value={youtrackConfig.token}
              onChange={e => setYouTrackConfig({...youtrackConfig, token: e.target.value})}
              required
            />
            <p className="form-hint">{t('dataSource.youtrack.tokenHint')}</p>
          </div>
          <button className="btn primary" onClick={fetchYouTrackProjects} disabled={loading || !youtrack.validateConfig(youtrackConfig)}>
            {loading ? t('common.loading') : t('dataSource.youtrack.connectBtn')}
          </button>
        </div>
      )}
      {step === 'project' && (
        <div className="selection-step">
          <button className="btn ghost back-btn" onClick={() => setStep('config')}>
            ← {t('common.back')}
          </button>
          <h3>{t('dataSource.youtrack.selectProject')}</h3>
          {loading ? (
            <div className="project-grid">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : youtrackProjects.length === 0 ? (
            <p className="muted">{t('dataSource.youtrack.noProjects')}</p>
          ) : (
            <div className="project-grid">
              {youtrackProjects.map(p => (
                <button
                  key={p.id}
                  className={`project-card${selectedYouTrackProject === p.id ? ' selected' : ''}`}
                  onClick={() => fetchYouTrackSprints(p.id)}
                >
                  <span className="project-key">{p.shortName}</span>
                  <span className="project-name">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {step === 'sprint' && (
        <div className="selection-step">
          <button className="btn ghost back-btn" onClick={() => setStep('project')}>
            ← {t('common.back')}
          </button>
          <h3>{t('dataSource.youtrack.selectSprint')}</h3>
          {loading ? (
            <div className="sprint-list">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : youtrackSprints.length === 0 ? (
            <p className="muted">{t('dataSource.youtrack.noSprints')}</p>
          ) : (
            <div className="sprint-list">
              {youtrackSprints.map(s => (
                <button
                  key={s.name}
                  className={`sprint-item${selectedYouTrackSprint === s.name ? ' selected' : ''}`}
                  onClick={() => importYouTrackSprint(s.name)}
                  disabled={loading}
                >
                  <span className="sprint-name">{s.name}</span>
                  {s.start && <span className="sprint-dates">{new Date(s.start).toLocaleDateString()} - {s.finish ? new Date(s.finish).toLocaleDateString() : t('dataSource.youtrack.ongoing')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
    </div>
  )

  return (
    <div className="page data-source-page">
      <header className="page-header">
        <h1>{t('dataSource.title')}</h1>
        <p className="muted">{t('dataSource.subtitle')}</p>
      </header>

      <div className="data-source-tabs">
        <button
          className={`tab-btn${activeTab === 'csv' ? ' active' : ''}`}
          onClick={() => { setActiveTab('csv'); setStep('config'); setError(null); }}
        >
          📄 {t('dataSource.csv.label')}
        </button>
        <button
          className={`tab-btn${activeTab === 'jira' ? ' active' : ''}`}
          onClick={() => { setActiveTab('jira'); setStep('config'); setError(null); }}
        >
          🔵 {t('dataSource.jira.label')}
        </button>
        <button
          className={`tab-btn${activeTab === 'youtrack' ? ' active' : ''}`}
          onClick={() => { setActiveTab('youtrack'); setStep('config'); setError(null); }}
        >
          🟣 {t('dataSource.youtrack.label')}
        </button>
      </div>

      <ProgressBar progress={progress} />

      {activeTab === 'csv' && renderCsvTab()}
      {activeTab === 'jira' && renderJiraTab()}
      {activeTab === 'youtrack' && renderYouTrackTab()}

      {datasets.length > 0 && (
        <div className="existing-data">
          <h3>{t('dataSource.existingData')}</h3>
          <p className="muted">{t('dataSource.existingDataBody')}</p>
          <NavLink to="/" className="btn primary">
            {t('dataSource.viewDashboard')}
          </NavLink>
        </div>
      )}
    </div>
  )
}