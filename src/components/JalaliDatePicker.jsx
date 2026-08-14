import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import {
  isoToJalaali,
  jalaaliToIso,
  jalaaliMonthLength,
  toGregorian,
} from '../utils/jalali'

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const toFa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]
const DOWS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function CalendarIcon() {
  return (
    <svg
      className="jalali-cal"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function JalaliDatePicker({ value, onChange, min, max, ariaLabel, placeholder }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const todayIso = new Date().toISOString().slice(0, 10)
  const today = isoToJalaali(todayIso)
  const selected = useMemo(() => isoToJalaali(value), [value])

  const [view, setView] = useState(() =>
    selected ? { jy: selected.jy, jm: selected.jm } : { jy: today.jy, jm: today.jm }
  )

  useEffect(() => {
    if (open && selected) setView({ jy: selected.jy, jm: selected.jm })
  }, [open, selected])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = selected
    ? `${toFa(selected.jd)} ${MONTHS[selected.jm - 1]} ${toFa(selected.jy)}`
    : placeholder

  const nav = (dir) => {
    setView((v) => {
      let jm = v.jm + dir
      let jy = v.jy
      if (jm < 1) {
        jm = 12
        jy -= 1
      }
      if (jm > 12) {
        jm = 1
        jy += 1
      }
      return { jy, jm }
    })
  }

  const dim = jalaaliMonthLength(view.jy, view.jm)
  const firstGreg = toGregorian(view.jy, view.jm, 1)
  const firstWeekday = (new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd).getDay() + 1) % 7

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let jd = 1; jd <= dim; jd++) {
    const iso = jalaaliToIso(view.jy, view.jm, jd)
    cells.push({
      jd,
      iso,
      disabled: (min && iso < min) || (max && iso > max),
      isSelected: iso === value,
      isToday: iso === todayIso,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const pick = (cell) => {
    if (!cell || cell.disabled) return
    onChange(cell.iso)
    setOpen(false)
  }

  const todayOk = !(min && todayIso < min) && !(max && todayIso > max)

  return (
    <div className={`jalali-picker${open ? ' open' : ''}`} ref={rootRef}>
      <button type="button" className="jalali-trigger" aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}>
        <CalendarIcon />
        <span className="jalali-value">{label}</span>
        <span className="jalali-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="jalali-popover" role="dialog" aria-label={ariaLabel}>
          <div className="jalali-nav">
            <button type="button" className="jalali-nav-btn" onClick={() => nav(-1)} aria-label="Prev">
              ‹
            </button>
            <div className="jalali-nav-label">
              {MONTHS[view.jm - 1]} {toFa(view.jy)}
            </div>
            <button type="button" className="jalali-nav-btn" onClick={() => nav(1)} aria-label="Next">
              ›
            </button>
          </div>
          <div className="jalali-grid">
            {DOWS.map((d, i) => (
              <div key={i} className={`jalali-dow${i === 6 ? ' fri' : ''}`}>
                {d}
              </div>
            ))}
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                disabled={!cell}
                className={`jalali-day${i % 7 === 6 ? ' fri' : ''}${cell?.isSelected ? ' selected' : ''}${
                  cell?.isToday ? ' today' : ''
                }${cell?.disabled ? ' disabled' : ''}`}
                onClick={() => pick(cell)}
              >
                {cell ? toFa(cell.jd) : ''}
              </button>
            ))}
          </div>
          <div className="jalali-footer">
            <button
              type="button"
              className="jalali-today-btn"
              disabled={!todayOk}
              onClick={() => {
                if (todayOk) {
                  onChange(todayIso)
                  setOpen(false)
                }
              }}
            >
              {t('window.today')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
