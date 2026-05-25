'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import type { JobFull } from '@/lib/services/jobs-data'

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ViewMode = 'hoje' | 'semana' | 'mes'

interface CalEvent {
  id: string
  title: string
  type: string
  date: string   // YYYY-MM-DD
  time: string   // HH:MM
  location: string
  status: string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; tc: string; border: string }> = {
  evento: { bg: '#ede9fe', tc: '#5b21b6', border: '#7c3aed' },
  ensaio: { bg: '#dbeafe', tc: '#1e40af', border: '#2563eb' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e', border: '#0d9488' },
}
const TYPE_LABELS: Record<string, string> = { evento: 'Evento', ensaio: 'Ensaio', diaria: 'Diária' }

const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function toYMD(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function startOfWeek(d: Date) {
  const clone = new Date(d)
  const day = clone.getDay()          // 0=Sun
  const diff = day === 0 ? -6 : 1 - day  // shift to Monday
  clone.setDate(clone.getDate() + diff)
  clone.setHours(0,0,0,0)
  return clone
}

function addDays(d: Date, n: number) {
  const clone = new Date(d)
  clone.setDate(clone.getDate() + n)
  return clone
}

// Derive events from jobs list
function buildEvents(source: JobFull[]): CalEvent[] {
  return source
    .filter(j => j.scheduledAt)
    .map(j => {
      const dt = new Date(j.scheduledAt!)
      const loc = typeof j.location === 'string'
        ? j.location
        : j.location?.name ?? ''
      return {
        id:       j.id,
        title:    j.clientName ?? j.title,
        type:     j.type,
        date:     toYMD(dt),
        time:     String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0'),
        location: loc,
        status:   j.status,
      }
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

// ─── EVENT CHIP ───────────────────────────────────────────────────────────────
function EventChip({ ev, compact = false }: { ev: CalEvent; compact?: boolean }) {
  const c = TYPE_COLORS[ev.type] ?? { bg: '#f3f4f6', tc: '#6b7280', border: '#9ca3af' }
  return (
    <a href={`/jobs/${ev.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: c.bg, borderLeft: '3px solid ' + c.border,
        borderRadius: compact ? 4 : 6,
        padding: compact ? '2px 5px' : '5px 7px',
        marginBottom: 3, overflow: 'hidden',
      }}
    >
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <Clock size={9} color={c.tc} />
          <span style={{ fontSize: 9, fontWeight: 600, color: c.tc }}>{ev.time}</span>
          <span style={{ fontSize: 9, color: c.tc, opacity: .7, marginLeft: 2 }}>{TYPE_LABELS[ev.type]}</span>
        </div>
      )}
      <div style={{ fontSize: compact ? 9 : 11, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {compact ? ev.time + ' ' : ''}{ev.title}
      </div>
      {!compact && ev.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <MapPin size={8} color="#9ca3af" />
          <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.location}</span>
        </div>
      )}
    </a>
  )
}

// ─── HOJE VIEW ────────────────────────────────────────────────────────────────
function TodayView({ events, today }: { events: CalEvent[]; today: string }) {
  const todayEvents = events.filter(e => e.date === today)
  if (todayEvents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
        <div style={{ fontSize: 13 }}>Nenhum evento hoje</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {todayEvents.map((ev, i) => {
        const c = TYPE_COLORS[ev.type] ?? { bg: '#f3f4f6', tc: '#6b7280', border: '#9ca3af' }
        return (
          <a key={ev.id} href={`/jobs/${ev.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: i < todayEvents.length-1 ? '0.5px solid #f3f4f6' : 'none', textDecoration: 'none' }}
          >
            <span style={{ width: 38, textAlign: 'right', fontSize: 12, color: '#7c3aed', fontWeight: 600, flexShrink: 0 }}>{ev.time}</span>
            <div style={{ width: 2, height: 32, background: c.border, borderRadius: 1, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ev.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, background: c.bg, color: c.tc, fontWeight: 600 }}>{TYPE_LABELS[ev.type]}</span>
                {ev.location && <span style={{ fontSize: 10, color: '#6b7280' }}>{ev.location}</span>}
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// ─── SEMANA VIEW ──────────────────────────────────────────────────────────────
function WeekView({ events, weekStart }: { events: CalEvent[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = toYMD(new Date())

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minHeight: 160 }}>
      {days.map(day => {
        const ymd    = toYMD(day)
        const isToday = ymd === today
        const dayEvs  = events.filter(e => e.date === ymd)
        return (
          <div key={ymd} style={{ minHeight: 120 }}>
            {/* Day header */}
            <div style={{ textAlign: 'center', marginBottom: 5 }}>
              <div style={{ fontSize: 9, color: isToday ? '#7c3aed' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {DOW_PT[day.getDay()]}
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', margin: '2px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? '#7c3aed' : 'transparent',
                fontSize: 12, fontWeight: 700,
                color: isToday ? '#fff' : '#374151',
              }}>
                {day.getDate()}
              </div>
            </div>
            {/* Events */}
            <div>
              {dayEvs.map(ev => <EventChip key={ev.id} ev={ev} compact />)}
              {dayEvs.length === 0 && (
                <div style={{ height: 4, borderRadius: 2, background: '#f3f4f6', margin: '0 2px' }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MES VIEW ─────────────────────────────────────────────────────────────────
function MonthView({ events, year, month }: { events: CalEvent[]; year: number; month: number }) {
  const today  = toYMD(new Date())
  const first  = new Date(year, month, 1)
  // Shift so week starts on Monday
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells  = Math.ceil((startDow + daysInMonth) / 7) * 7

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < totalCells) cells.push(null)

  return (
    <div>
      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', padding: '0 0 4px' }}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 2px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ minHeight: 64 }} />
          const ymd     = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = ymd === today
          const dayEvs  = events.filter(e => e.date === ymd)
          return (
            <div key={ymd}
              style={{
                minHeight: 64, borderRadius: 6, padding: '4px 3px',
                background: isToday ? '#f5f3ff' : '#fff',
                border: isToday ? '1.5px solid #7c3aed' : '0.5px solid #f3f4f6',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? '#7c3aed' : 'transparent',
                fontSize: 10, fontWeight: 700,
                color: isToday ? '#fff' : '#374151',
                marginBottom: 3,
              }}>{day}</div>
              {dayEvs.slice(0, 2).map(ev => <EventChip key={ev.id} ev={ev} compact />)}
              {dayEvs.length > 2 && (
                <div style={{ fontSize: 9, color: '#9ca3af', paddingLeft: 3 }}>+{dayEvs.length - 2} mais</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function AgendaCalendar({ jobs }: { jobs?: JobFull[] }) {
  const [view, setView]       = useState<ViewMode>('semana')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [calMonth, setCalMonth]   = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const events = useMemo(() => buildEvents(jobs ?? []), [jobs])
  const today  = toYMD(new Date())

  // Navigation
  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, +7)) }
  function prevMonth() {
    setCalMonth(({ year, month }) => month === 0
      ? { year: year - 1, month: 11 }
      : { year, month: month - 1 })
  }
  function nextMonth() {
    setCalMonth(({ year, month }) => month === 11
      ? { year: year + 1, month: 0 }
      : { year, month: month + 1 })
  }

  // Header label
  const headerLabel = view === 'hoje'
    ? new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : view === 'semana'
    ? (() => {
        const end = addDays(weekStart, 6)
        const sm = weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
        const em = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
        return `${sm} — ${em}`
      })()
    : MONTH_PT[calMonth.month] + ' ' + calMonth.year

  const showNav = view === 'semana' || view === 'mes'

  // Count events for month
  const monthEvCount = view === 'mes'
    ? events.filter(e => e.date.startsWith(`${calMonth.year}-${String(calMonth.month+1).padStart(2,'0')}`)).length
    : null

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['hoje','semana','mes'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? '#7c3aed' : '#6b7280',
                fontWeight: view === v ? 600 : 400,
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}
            >{v === 'hoje' ? 'Hoje' : v === 'semana' ? 'Semana' : 'Mês'}</button>
          ))}
        </div>

        {/* Nav arrows */}
        {showNav && (
          <>
            <button onClick={view === 'semana' ? prevWeek : prevMonth}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
            ><ChevronLeft size={13} color="#6b7280" /></button>
            <button onClick={view === 'semana' ? nextWeek : nextMonth}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
            ><ChevronRight size={13} color="#6b7280" /></button>
          </>
        )}

        {/* Period label */}
        <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, textTransform: 'capitalize' }}>{headerLabel}</span>

        {/* Badges */}
        {view === 'mes' && monthEvCount !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 9, fontWeight: 600 }}>
            {monthEvCount} evento{monthEvCount !== 1 ? 's' : ''}
          </span>
        )}
        {view === 'hoje' && (
          <span style={{ marginLeft: 'auto', fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 9, fontWeight: 600 }}>
            {events.filter(e => e.date === today).length} hoje
          </span>
        )}
        {view === 'semana' && (
          <span style={{ marginLeft: 'auto', fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 9, fontWeight: 600 }}>
            {events.filter(e => {
              const end = addDays(weekStart, 6)
              return e.date >= toYMD(weekStart) && e.date <= toYMD(end)
            }).length} esta semana
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {view === 'hoje'   && <TodayView events={events} today={today} />}
      {view === 'semana' && <WeekView  events={events} weekStart={weekStart} />}
      {view === 'mes'    && <MonthView events={events} year={calMonth.year} month={calMonth.month} />}
    </div>
  )
}
