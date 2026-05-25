'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export function SlideOver({ open, onClose, title, subtitle, children, footer, width = 480 }: SlideOverProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn .2s cubic-bezier(.16,1,.3,1)',
      }}>
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(.96) translateY(8px); }
            to   { opacity: 1; transform: scale(1)  translateY(0);    }
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose}
            style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#111827', outline: 'none', background: '#fff',
  boxSizing: 'border-box',
}

export const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#111827', outline: 'none', background: '#fff',
  cursor: 'pointer', boxSizing: 'border-box',
}

export function BtnPrimary({ onClick, children, color = '#7c3aed', disabled }: { onClick?: () => void; children: React.ReactNode; color?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '9px 20px', background: disabled ? '#c4b5fd' : color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}>
      {children}
    </button>
  )
}

export function BtnSecondary({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ padding: '9px 20px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
      {children}
    </button>
  )
}
