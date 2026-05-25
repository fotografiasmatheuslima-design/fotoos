'use client'
import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  chip?: { label: string; color: 'purple' | 'teal' }
}

export function Header({ title, chip }: HeaderProps) {
  return (
    <header className="flex items-center justify-between flex-shrink-0" style={{ padding: '9px 18px', borderBottom: '0.5px solid #e5e7eb', background: '#fff' }}>
      <div className="flex items-center gap-2">
        <span style={{ fontWeight: 500, fontSize: 13, color: '#111827' }}>{title}</span>
        {chip && (
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11,
            background: chip.color === 'purple' ? '#ede9fe' : '#ccfbf1',
            color: chip.color === 'purple' ? '#5b21b6' : '#134e4a',
          }}>
            {chip.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={17} color="#6b7280" />
          <div style={{ position: 'absolute', top: -3, right: -4, width: 15, height: 15, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 500 }}>6</div>
        </div>
      </div>
    </header>
  )
}
