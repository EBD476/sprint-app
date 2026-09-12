import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth, defaultPermissions } from '../store/AuthContext'
import { useI18n } from '../i18n'

const PANEL_PERMISSIONS = [
  { key: 'standup', label: 'panel.standup' },
  { key: 'sankey', label: 'panel.sankey' },
  { key: 'network', label: 'panel.network' },
  { key: 'burndown', label: 'panel.burndown' },
  { key: 'velocity', label: 'panel.velocity' },
  { key: 'flow', label: 'panel.flow' },
  { key: 'capacity', label: 'panel.capacity' },
  { key: 'report', label: 'panel.report' },
  { key: 'status', label: 'panel.status' },
  { key: 'assignee', label: 'panel.assignee' },
  { key: 'sprintProgress', label: 'panel.sprintProgress' },
  { key: 'cycleTimes', label: 'panel.cycleTimes' },
  { key: 'tasks', label: 'panel.tasks' },
]

const PAGE_PERMISSIONS = [
  { key: 'dashboard', label: 'nav.dashboard' },
  { key: 'compare', label: 'nav.compare' },
  { key: 'analysis', label: 'nav.analysis' },
  { key: 'presets', label: 'nav.presets' },
  { key: 'dataSource', label: 'nav.dataSource' },
  { key: 'llmSettings', label: 'nav.llmSettings' },
  { key: 'settings', label: 'nav.settings' },
  { key: 'admin', label: 'nav.admin' },
]

const ROLE_OPTIONS = [
  { value: 'admin', label: 'auth.roleAdmin' },
  { value: 'viewer', label: 'auth.roleViewer' },
  { value: 'editor', label: 'auth.roleEditor' },
]

function roleLabel(t, role) {
  return t(`auth.role${role.charAt(0).toUpperCase() + role.slice(1)}`)
}

function initialsOf(user) {
  const source = user.name || user.username || '?'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(raw, locale) {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  try {
    return d.toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d.toLocaleDateString()
  }
}

function UserModal({ t, mode, user, isSelf, onClose, onSaved }) {
  const { createUser, updateUser } = useAuth()
  const [tab, setTab] = useState('details')
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
  }))
  const [perms, setPerms] = useState(() => (user?.permissions ? JSON.parse(JSON.stringify(user.permissions)) : defaultPermissions()))

  const isAdmin = form.role === 'admin'
  const permissionsLocked = isAdmin || isSelf

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const togglePage = (key) =>
    setPerms((p) => ({ ...p, [key]: !p[key] }))
  const togglePanel = (key) =>
    setPerms((p) => ({ ...p, panels: { ...p.panels, [key]: !p.panels[key] } }))
  const setAllPages = (value) =>
    setPerms((p) => ({ ...p, ...Object.fromEntries(PAGE_PERMISSIONS.map((x) => [x.key, value])) }))
  const setAllPanels = (value) =>
    setPerms((p) => ({ ...p, panels: Object.fromEntries(PANEL_PERMISSIONS.map((x) => [x.key, value])) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'edit') {
      const updates = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: perms,
      }
      if (form.password) updates.password = form.password
      const result = updateUser(user.id, updates)
      if (result.success) onSaved()
      else setError(t(result.error))
    } else {
      const result = createUser({ ...form, permissions: perms })
      if (result.success) onSaved()
      else setError(t(result.error))
    }
  }

  const handleTab = (name) => {
    setTab(name)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal wide admin-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{mode === 'edit' ? t('admin.editUser') : t('admin.createUser')}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t('close.aria')}>
            ×
          </button>
        </div>

        <div className="settings-tabs admin-tabs" role="tablist">
          <button
            className={`settings-tab${tab === 'details' ? ' active' : ''}`}
            onClick={() => handleTab('details')}
          >
            👤 {t('admin.details')}
          </button>
          <button
            className={`settings-tab${tab === 'permissions' ? ' active' : ''}`}
            onClick={() => handleTab('permissions')}
          >
            🔐 {t('admin.permissions')}
          </button>
        </div>

        {tab === 'details' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div>
                <label>
                  {t('auth.username')}{' '}
                  {mode === 'edit' && <span className="muted">({t('auth.leaveBlankToKeep')})</span>}
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={set('username')}
                  required
                  disabled={mode === 'edit'}
                  autoComplete="off"
                />
              </div>
              <div>
                <label>{t('auth.password')}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  required={mode !== 'edit'}
                  placeholder={mode === 'edit' ? t('auth.leaveBlankToKeep') : ''}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>{t('auth.name')}</label>
                <input type="text" value={form.name} onChange={set('name')} required autoComplete="off" />
              </div>
              <div>
                <label>{t('auth.email')}</label>
                <input type="email" value={form.email} onChange={set('email')} autoComplete="off" />
              </div>
            </div>
            <div className="form-group">
              <label>{t('auth.role')}</label>
              <select value={form.role} onChange={set('role')} disabled={isSelf}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.label)}
                  </option>
                ))}
              </select>
            </div>

            {permissionsLocked && (
              <div className="admin-hint">
                {isAdmin
                  ? t('admin.adminFullAccess')
                  : isSelf
                    ? t('admin.selfLock')
                    : ''}
              </div>
            )}

            {error && <div className="admin-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn primary">
                {mode === 'edit' ? t('common.save') : t('admin.create')}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="muted small modal-note">{t('admin.permissionsTabHint')}</p>

            {permissionsLocked && (
              <div className="admin-hint">
                {isAdmin
                  ? t('admin.adminFullAccess')
                  : isSelf
                    ? t('admin.selfLock')
                    : ''}
              </div>
            )}

            <div className="perm-section">
              <div className="perm-section-header">
                <span>{t('admin.pagesAccess')}</span>
                <span className="perm-section-actions">
                  <button type="button" className="btn tiny" disabled={permissionsLocked} onClick={() => setAllPages(true)}>
                    ✓ {t('admin.grantAll')}
                  </button>
                  <button type="button" className="btn tiny" disabled={permissionsLocked} onClick={() => setAllPages(false)}>
                    ✕ {t('admin.revokeAll')}
                  </button>
                </span>
              </div>
              <div className="perm-list">
                {PAGE_PERMISSIONS.map((p) => (
                  <label key={p.key} className={`perm-row${perms[p.key] ? ' granted' : ''}${permissionsLocked ? ' locked' : ''}`}>
                    <span className="perm-name">{t(p.label)}</span>
                    <span className="perm-switch">
                      <input
                        type="checkbox"
                        checked={perms[p.key]}
                        disabled={permissionsLocked}
                        onChange={() => togglePage(p.key)}
                      />
                      <span className="perm-slider" aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="perm-section">
              <div className="perm-section-header">
                <span>{t('admin.panelsAccess')}</span>
                <span className="perm-section-actions">
                  <button type="button" className="btn tiny" disabled={permissionsLocked} onClick={() => setAllPanels(true)}>
                    ✓ {t('admin.grantAll')}
                  </button>
                  <button type="button" className="btn tiny" disabled={permissionsLocked} onClick={() => setAllPanels(false)}>
                    ✕ {t('admin.revokeAll')}
                  </button>
                </span>
              </div>
              <div className="perm-list">
                {PANEL_PERMISSIONS.map((p) => (
                  <label key={p.key} className={`perm-row${perms.panels?.[p.key] ? ' granted' : ''}${permissionsLocked ? ' locked' : ''}`}>
                    <span className="perm-name">{t(p.label)}</span>
                    <span className="perm-switch">
                      <input
                        type="checkbox"
                        checked={perms.panels?.[p.key]}
                        disabled={permissionsLocked}
                        onChange={() => togglePanel(p.key)}
                      />
                      <span className="perm-slider" aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <div className="admin-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn primary" onClick={handleSubmit}>
                {mode === 'edit' ? t('common.save') : t('admin.create')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteModal({ t, user, onClose, onDeleted }) {
  const { deleteUser } = useAuth()
  const [error, setError] = useState('')

  const handleDelete = () => {
    const result = deleteUser(user.id)
    if (result.success) onDeleted()
    else setError(t(result.error))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal admin-confirm-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t('admin.deleteTitle')}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t('close.aria')}>
            ×
          </button>
        </div>
        <div className="admin-confirm-body">
          <div className={`admin-confirm-avatar role-${user.role}`}>{initialsOf(user)}</div>
          <div>
            <p>{t('admin.deleteConfirm', { name: user.name || user.username })}</p>
            <p className="muted small mono">{user.username}</p>
          </div>
        </div>
        {error && <div className="admin-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn danger" onClick={handleDelete}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const { t, locale } = useI18n()
  const { users, currentUser } = useAuth()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modal, setModal] = useState(null) // { mode: 'create' | 'edit', user }
  const [deleting, setDeleting] = useState(null)

  const counts = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      editor: users.filter((u) => u.role === 'editor').length,
      viewer: users.filter((u) => u.role === 'viewer').length,
    }),
    [users]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const roleOk = roleFilter === 'all' || u.role === roleFilter
      if (!roleOk) return false
      if (!q) return true
      return (
        u.username.toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
    })
  }, [users, search, roleFilter])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setModal(null)
        setDeleting(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const stats = [
    { key: 'total', label: t('admin.stats.total'), value: counts.total, icon: '👥' },
    { key: 'admin', label: t('admin.stats.admins'), value: counts.admin, icon: '🛡️', tone: 'admin' },
    { key: 'editor', label: t('admin.stats.editors'), value: counts.editor, icon: '✍️', tone: 'editor' },
    { key: 'viewer', label: t('admin.stats.viewers'), value: counts.viewer, icon: '👁️', tone: 'viewer' },
  ]

  return (
    <div className="admin-page">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert">
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}
      <div className="page-header">
        <h1>{t('nav.admin')}</h1>
        <p className="muted">{t('admin.subtitle')}</p>
      </div>

      <div className="admin-stats">
        {stats.map((s) => (
          <div key={s.key} className="admin-stat-card">
            <span className="admin-stat-icon" aria-hidden="true">{s.icon}</span>
            <div>
              <div className={`admin-stat-value${s.tone ? ` tone-${s.tone}` : ''}`}>{s.value}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search')}
            aria-label={t('admin.search')}
          />
        </div>
        <select
          className="admin-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t('admin.allRoles')}
        >
          <option value="all">{t('admin.allRoles')}</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {t(r.label)}
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={() => setModal({ mode: 'create' })}>
          + {t('admin.createUser')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty muted">{t('admin.noUsers')}</div>
      ) : (
        <div className="user-grid">
          {filtered.map((user) => {
            const isSelf = user.id === currentUser?.id
            const pageCount = PAGE_PERMISSIONS.filter((p) => user.permissions?.[p.key]).length
            const panelCount = PANEL_PERMISSIONS.filter((p) => user.permissions?.panels?.[p.key]).length
            const lastLogin = formatDate(user.lastLogin, locale)
            return (
              <div className={`user-card${isSelf ? ' self' : ''}`} key={user.id}>
                <div className="user-card-header">
                  <div className={`user-avatar lg role-${user.role}`}>{initialsOf(user)}</div>
                  <div className="user-card-id">
                    <div className="user-name">{user.name || '—'}</div>
                    <div className="user-username">@{user.username}</div>
                  </div>
                  {isSelf && <span className="user-self-tag">{t('admin.self')}</span>}
                </div>
                <div className="user-card-role">
                  <span className={`role-badge role-${user.role}`}>{roleLabel(t, user.role)}</span>
                  {user.role === 'admin' && <span className="muted small">{t('auth.adminRole')}</span>}
                </div>
                <div className="user-card-meta">
                  <span title={t('auth.email')}>{user.email || '—'}</span>
                  <span title={t('admin.lastLogin')}>
                    {lastLogin ? `🕒 ${lastLogin}` : '—'}
                  </span>
                </div>
                <div className="user-card-access">
                  <span className={`access-chip${pageCount === PAGE_PERMISSIONS.length ? ' all' : ''}`}>
                    {t('admin.pagesGranted', { count: pageCount })}
                  </span>
                  <span className={`access-chip${panelCount === PANEL_PERMISSIONS.length ? ' all' : ''}`}>
                    {t('admin.panelsGranted', { count: panelCount })}
                  </span>
                </div>
                <div className="user-card-actions">
                  <button className="btn tiny" onClick={() => setModal({ mode: 'edit', user })}>
                    ✏️ {t('common.edit')}
                  </button>
                  {!isSelf && (
                    <button className="btn tiny danger" onClick={() => setDeleting(user)}>
                      🗑️ {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <UserModal
          key={`${modal.mode}-${modal.user?.id || 'new'}`}
          t={t}
          mode={modal.mode}
          user={modal.user}
          isSelf={modal.user?.id === currentUser?.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            showToast(modal.mode === 'edit' ? t('admin.successEdit') : t('admin.successCreated'), 'success')
          }}
        />
      )}

      {deleting && (
        <DeleteModal
          t={t}
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null)
            showToast(t('admin.successDeleted'), 'success')
          }}
        />
      )}
    </div>
  )
}