import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import FileUpload from '../components/FileUpload'
import { useSprint } from '../store/SprintContext'

export default function DataSourceSelector() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { datasets, addDataset, openMapping } = useSprint()
  const [activeTab, setActiveTab] = useState('csv')
  const [jiraConfig, setJiraConfig] = useState({ baseUrl: '', email: '', apiToken: '' })
  const [youtrackConfig, setYouTrackConfig] = useState({ baseUrl: '', token: '' })
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

  const handleFileUpload = (tasks, meta) => {
    addDataset({ ...meta, tasks })
    navigate('/')
  }

  const handleNeedsMapping = (payload) => {
    openMapping({ ...payload, mode: 'add' })
  }

  const validateJiraConfig = () => {
    return jiraConfig.baseUrl.trim() && jiraConfig.email.trim() && jiraConfig.apiToken.trim()
  }

  const validateYouTrackConfig = () => {
    return youtrackConfig.baseUrl.trim() && youtrackConfig.token.trim()
  }

  const fetchJiraProjects = async () => {
    if (!validateJiraConfig()) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${jiraConfig.baseUrl.replace(/\/$/, '')}/rest/api/3/project/search`, {
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`Jira API error: ${response.status}`)
      const data = await response.json()
      setJiraProjects(data.values || data)
      setStep('project')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchJiraSprints = async (projectKey) => {
    setLoading(true)
    setError(null)
    try {
      const boardRes = await fetch(`${jiraConfig.baseUrl.replace(/\/$/, '')}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Accept': 'application/json'
        }
      })
      if (!boardRes.ok) throw new Error(`Jira Board API error: ${boardRes.status}`)
      const boardData = await boardRes.json()
      const boards = boardData.values || []
      
      if (boards.length === 0) {
        setJiraSprints([])
        setStep('sprint')
        return
      }

      const sprintRes = await fetch(`${jiraConfig.baseUrl.replace(/\/$/, '')}/rest/agile/1.0/board/${boards[0].id}/sprint?state=active,closed,future`, {
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Accept': 'application/json'
        }
      })
      if (!sprintRes.ok) throw new Error(`Jira Sprint API error: ${sprintRes.status}`)
      const sprintData = await sprintRes.json()
      setJiraSprints(sprintData.values || [])
      setStep('sprint')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const importJiraSprint = async (sprintId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${jiraConfig.baseUrl.replace(/\/$/, '')}/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=1000&fields=summary,status,assignee,issuetype,priority,created,updated,resolutiondate,duedate,storypoints,sprint,timeoriginalestimate,labels,comment`, {
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`Jira Issues API error: ${response.status}`)
      const data = await response.json()
      const issues = data.issues || []
      
      const tasks = issues.map(issue => {
        const fields = issue.fields
        const sprintName = fields.sprint ? fields.sprint.map(s => s.name).join(', ') : ''
        const storyPoints = fields.customfield_10016 || fields.customfield_10020 || fields.customfield_10002 || null
        
        return {
          key: issue.key,
          summary: fields.summary || '',
          type: fields.issuetype?.name || 'Task',
          status: fields.status?.name || 'Unknown',
          priority: fields.priority?.name || '',
          assignee: fields.assignee?.displayName || 'Unassigned',
          reporter: fields.reporter?.displayName || '',
          created: fields.created,
          updated: fields.updated,
          resolved: fields.resolutiondate,
          dueDate: fields.duedate,
          storyPoints: storyPoints ? parseFloat(storyPoints) : null,
          sprint: sprintName,
          timeSpent: fields.timeoriginalestimate ? fields.timeoriginalestimate / 3600 : null,
          labels: fields.labels || [],
          comment: fields.comment?.comments?.[0]?.body || ''
        }
      }).filter(t => t.key || t.summary)

      const headers = ['key', 'summary', 'type', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated', 'resolved', 'dueDate', 'storyPoints', 'sprint', 'timeSpent', 'labels', 'comment']
      addDataset({ fileName: `Jira Sprint ${selectedJiraSprint}`, headers, columnMap: {}, rows: tasks, tasks })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchYouTrackProjects = async () => {
    if (!validateYouTrackConfig()) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${youtrackConfig.baseUrl.replace(/\/$/, '')}/api/admin/projects?fields=id,name,shortName`, {
        headers: {
          'Authorization': `Bearer ${youtrackConfig.token}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`YouTrack API error: ${response.status}`)
      const data = await response.json()
      setYouTrackProjects(data)
      setStep('project')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchYouTrackSprints = async (projectId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${youtrackConfig.baseUrl.replace(/\/$/, '')}/api/issues?query=project:${projectId}%20has:%20sprint&fields=id,summary,sprint,name,start,finish,archived`, {
        headers: {
          'Authorization': `Bearer ${youtrackConfig.token}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`YouTrack Sprint API error: ${response.status}`)
      const data = await response.json()
      const sprints = [...new Map(data.map(i => [i.sprint?.name, i.sprint]).filter(([k]) => k)).values()]
      setYouTrackSprints(sprints)
      setStep('sprint')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const importYouTrackSprint = async (sprintName) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${youtrackConfig.baseUrl.replace(/\/$/, '')}/api/issues?query=sprint:${encodeURIComponent(sprintName)}&fields=id,summary,project,type,state,assignee,reporter,created,updated,resolved,dueDate,customFields(name,value),timeSpent,tags(name),comments(text)`, {
        headers: {
          'Authorization': `Bearer ${youtrackConfig.token}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`YouTrack Issues API error: ${response.status}`)
      const data = await response.json()
      
      const tasks = data.map(issue => {
        const customFields = {}
        issue.customFields?.forEach(f => { customFields[f.name] = f.value })
        
        return {
          key: issue.idReadable || issue.id,
          summary: issue.summary || '',
          type: issue.$type?.replace('Issue', '') || 'Task',
          status: issue.state?.name || issue.state?.localizedName || 'Unknown',
          priority: customFields.Priority?.name || customFields.Priority || '',
          assignee: issue.assignee?.fullName || issue.assignee?.name || 'Unassigned',
          reporter: issue.reporter?.fullName || issue.reporter?.name || '',
          created: issue.created ? new Date(issue.created).toISOString() : null,
          updated: issue.updated ? new Date(issue.updated).toISOString() : null,
          resolved: issue.resolved ? new Date(issue.resolved).toISOString() : null,
          dueDate: customFields['Due Date']?.value ? new Date(customFields['Due Date'].value).toISOString() : null,
          storyPoints: customFields['Story Points']?.value || customFields['Story points']?.value || null,
          sprint: sprintName,
          timeSpent: issue.timeSpent ? issue.timeSpent / 3600 / 1000 : null,
          labels: issue.tags?.map(t => t.name) || [],
          comment: issue.comments?.[0]?.text || ''
        }
      }).filter(t => t.key || t.summary)

      const headers = ['key', 'summary', 'type', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated', 'resolved', 'dueDate', 'storyPoints', 'sprint', 'timeSpent', 'labels', 'comment']
      addDataset({ fileName: `YouTrack Sprint ${sprintName}`, headers, columnMap: {}, rows: tasks, tasks })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <button className="btn primary" onClick={fetchJiraProjects} disabled={loading || !validateJiraConfig()}>
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
          {jiraProjects.length === 0 ? (
            <p className="muted">{t('dataSource.jira.noProjects')}</p>
          ) : (
            <div className="project-grid">
              {jiraProjects.map(p => (
                <button
                  key={p.key || p.id}
                  className={`project-card${selectedJiraProject === (p.key || p.id) ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedJiraProject(p.key || p.id)
                    fetchJiraSprints(p.key || p.id)
                  }}
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
          {jiraSprints.length === 0 ? (
            <p className="muted">{t('dataSource.jira.noSprints')}</p>
          ) : (
            <div className="sprint-list">
              {jiraSprints.map(s => (
                <button
                  key={s.id}
                  className={`sprint-item${selectedJiraSprint === s.id ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedJiraSprint(s.id)
                    importJiraSprint(s.id)
                  }}
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
          <button className="btn primary" onClick={fetchYouTrackProjects} disabled={loading || !validateYouTrackConfig()}>
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
          {youtrackProjects.length === 0 ? (
            <p className="muted">{t('dataSource.youtrack.noProjects')}</p>
          ) : (
            <div className="project-grid">
              {youtrackProjects.map(p => (
                <button
                  key={p.id}
                  className={`project-card${selectedYouTrackProject === p.id ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedYouTrackProject(p.id)
                    fetchYouTrackSprints(p.id)
                  }}
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
          {youtrackSprints.length === 0 ? (
            <p className="muted">{t('dataSource.youtrack.noSprints')}</p>
          ) : (
            <div className="sprint-list">
              {youtrackSprints.map(s => (
                <button
                  key={s.name}
                  className={`sprint-item${selectedYouTrackSprint === s.name ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedYouTrackSprint(s.name)
                    importYouTrackSprint(s.name)
                  }}
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