import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { computeStats } from '../utils/stats'
import { buildTasks } from '../utils/csv'
import { applyWindow, activeSprintRange } from '../utils/window'

const SprintContext = createContext(null)
const STORAGE_KEY = 'sprint-pulse-data'
const WINDOW_KEY = 'sprint-pulse-window'

function loadWindow() {
  try {
    const raw = localStorage.getItem(WINDOW_KEY)
    if (!raw) return { start: null, end: null }
    const parsed = JSON.parse(raw)
    return {
      start: typeof parsed.start === 'string' && parsed.start ? parsed.start.slice(0, 10) : null,
      end: typeof parsed.end === 'string' && parsed.end ? parsed.end.slice(0, 10) : null,
    }
  } catch {
    return { start: null, end: null }
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeLabel(fileName) {
  return String(fileName || 'Dataset').replace(/\.csv$/i, '')
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { datasets: [], activeId: null }
    const parsed = JSON.parse(raw)
    return {
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets : [],
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
    }
  } catch {
    return { datasets: [], activeId: null }
  }
}

export function SprintProvider({ children }) {
  const [initial] = useState(loadPersisted)
  const [datasets, setDatasets] = useState(initial.datasets)
  const [activeId, setActiveId] = useState(initial.activeId)
  const [pendingMapping, setPendingMapping] = useState(null)
  const [window, setWindow] = useState(loadWindow)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ datasets, activeId }))
    } catch {
      // storage full or unavailable — persistence best-effort only
    }
  }, [datasets, activeId])

  useEffect(() => {
    try {
      localStorage.setItem(WINDOW_KEY, JSON.stringify(window))
    } catch {
      // persistence best-effort only
    }
  }, [window])

  const addDataset = (meta) => {
    const ds = {
      id: makeId(),
      label: makeLabel(meta.fileName),
      fileName: meta.fileName,
      headers: meta.headers,
      columnMap: meta.columnMap,
      rows: meta.rows,
      tasks: meta.tasks,
      loadedAt: Date.now(),
    }
    setDatasets((prev) => [...prev, ds])
    setActiveId(ds.id)
    setWindow((prev) => {
      if (prev.start || prev.end) return prev
      if (meta.sprintDates?.start || meta.sprintDates?.end) {
        return {
          start: meta.sprintDates.start ? meta.sprintDates.start.slice(0, 10) : null,
          end: meta.sprintDates.end ? meta.sprintDates.end.slice(0, 10) : null
        }
      }
      const w = activeSprintRange(meta.tasks)
      return w || prev
    })
  }

  const updateActive = (patch) => {
    setDatasets((prev) => prev.map((d) => (d.id === activeId ? { ...d, ...patch } : d)))
  }

  const removeDataset = (id) => {
    setDatasets((prev) => {
      const next = prev.filter((d) => d.id !== id)
      if (activeId === id) {
        setActiveId(next.length ? next[next.length - 1].id : null)
      }
      return next
    })
  }

  const openMapping = (payload) => setPendingMapping(payload)
  const cancelMapping = () => setPendingMapping(null)

  const applyMapping = (columnMap) => {
    const p = pendingMapping
    if (!p) return
    try {
      const tasks = buildTasks(p.rows, columnMap)
      const meta = { fileName: p.fileName, headers: p.headers, columnMap, rows: p.rows, tasks }
      if (p.mode === 'add') addDataset(meta)
      else if (p.mode === 'replace') updateActive(meta)
      else updateActive({ columnMap, tasks })
      setPendingMapping(null)
    } catch (err) {
      return err.message
    }
  }

  const active = useMemo(() => datasets.find((d) => d.id === activeId) ?? null, [datasets, activeId])
  const allTasks = active?.tasks ?? null
  const tasks = useMemo(() => applyWindow(allTasks, window), [allTasks, window])
  const stats = useMemo(() => (tasks ? computeStats(tasks) : null), [tasks])
  const csvMeta = active

  const value = useMemo(
    () => ({
      datasets,
      activeId,
      active,
      tasks,
      allTasks,
      stats,
      csvMeta,
      window,
      setWindow,
      resetWindow: () => setWindow({ start: null, end: null }),
      addDataset,
      updateActive,
      removeDataset,
      removeActive: () => (activeId ? removeDataset(activeId) : null),
      setActive: setActiveId,
      pendingMapping,
      openMapping,
      cancelMapping,
      applyMapping,
    }),
    [datasets, activeId, active, tasks, allTasks, stats, csvMeta, window, pendingMapping]
  )

  return <SprintContext.Provider value={value}>{children}</SprintContext.Provider>
}

export function useSprint() {
  const ctx = useContext(SprintContext)
  if (!ctx) throw new Error('useSprint must be used within SprintProvider')
  return ctx
}
