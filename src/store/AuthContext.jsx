import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const USERS_KEY = 'sprint-pulse-users'
const SESSION_KEY = 'sprint-pulse-session'

const DEFAULT_USERS = [
  {
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator',
    email: 'admin@sprint-pulse.local',
    role: 'admin',
    permissions: {
      dashboard: true,
      compare: true,
      analysis: true,
      presets: true,
      dataSource: true,
      llmSettings: true,
      settings: true,
      admin: true,
      panels: {
        standup: true,
        sankey: true,
        network: true,
        burndown: true,
        velocity: true,
        flow: true,
        capacity: true,
        report: true,
        status: true,
        assignee: true,
        sprintProgress: true,
        cycleTimes: true,
        tasks: true,
      },
    },
    createdAt: new Date().toISOString(),
    lastLogin: null,
  },
  {
    id: 'viewer',
    username: 'viewer',
    password: 'viewer123',
    name: 'Viewer',
    email: 'viewer@sprint-pulse.local',
    role: 'viewer',
    permissions: {
      dashboard: true,
      compare: false,
      analysis: false,
      presets: false,
      dataSource: false,
      llmSettings: false,
      settings: false,
      admin: false,
      panels: {
        standup: true,
        sankey: true,
        network: false,
        burndown: true,
        velocity: true,
        flow: false,
        capacity: false,
        report: false,
        status: true,
        assignee: true,
        sprintProgress: true,
        cycleTimes: false,
        tasks: true,
      },
    },
    createdAt: new Date().toISOString(),
    lastLogin: null,
  },
]

export function defaultPermissions() {
  return {
    dashboard: true,
    compare: false,
    analysis: false,
    presets: false,
    dataSource: false,
    llmSettings: false,
    settings: false,
    admin: false,
    panels: {
      standup: true,
      sankey: true,
      network: false,
      burndown: true,
      velocity: true,
      flow: false,
      capacity: false,
      report: false,
      status: true,
      assignee: true,
      sprintProgress: true,
      cycleTimes: false,
      tasks: true,
    },
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS))
  return DEFAULT_USERS
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.userId && parsed.expiresAt > Date.now()) {
        return parsed
      }
    }
  } catch {}
  return null
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {}
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(loadUsers)
  const [session, setSession] = useState(loadSession)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      const user = users.find((u) => u.id === session.userId)
      if (user) {
        setCurrentUser(user)
      } else {
        clearSession()
        setSession(null)
      }
    }
    setLoading(false)
  }, [session, users])

  const login = useCallback((username, password) => {
    const user = users.find(
      (u) => u.username === username && u.password === password
    )
    if (!user) return { success: false, error: 'auth.invalidCredentials' }

    const newSession = {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }
    saveSession(newSession)
    setSession(newSession)
    setCurrentUser(user)

    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
    )
    setUsers(updatedUsers)
    saveUsers(updatedUsers)

    return { success: true, user }
  }, [users])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    setCurrentUser(null)
  }, [])

  const createUser = useCallback(
    (userData) => {
      if (users.some((u) => u.username === userData.username)) {
        return { success: false, error: 'auth.usernameExists' }
      }
      const newUser = {
        id: `user_${Date.now()}`,
        ...userData,
        permissions: userData.permissions || defaultPermissions(),
        createdAt: new Date().toISOString(),
        lastLogin: null,
      }
      const updatedUsers = [...users, newUser]
      setUsers(updatedUsers)
      saveUsers(updatedUsers)
      return { success: true, user: newUser }
    },
    [users]
  )

  const updateUser = useCallback(
    (userId, updates) => {
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      )
      setUsers(updatedUsers)
      saveUsers(updatedUsers)
      if (currentUser?.id === userId) {
        setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null))
      }
      return { success: true }
    },
    [users, currentUser]
  )

  const deleteUser = useCallback(
    (userId) => {
      if (userId === currentUser?.id) {
        return { success: false, error: 'auth.cannotDeleteSelf' }
      }
      const updatedUsers = users.filter((u) => u.id !== userId)
      setUsers(updatedUsers)
      saveUsers(updatedUsers)
      return { success: true }
    },
    [users, currentUser]
  )

  const updatePermissions = useCallback(
    (userId, permissions) => {
      return updateUser(userId, { permissions })
    },
    [updateUser]
  )

  const hasPermission = useCallback(
    (permission) => {
      if (!currentUser) return false
      if (currentUser.role === 'admin') return true
      const keys = permission.split('.')
      let perm = currentUser.permissions
      for (const key of keys) {
        if (perm === undefined || perm === null) return false
        perm = perm[key]
      }
      return perm === true
    },
    [currentUser]
  )

  const value = {
    users,
    currentUser,
    session,
    loading,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    updatePermissions,
    hasPermission,
    isAdmin: currentUser?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}