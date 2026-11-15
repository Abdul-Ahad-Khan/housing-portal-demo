import type { ReactNode } from 'react'

export function Card({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-h">
          <h3>{title}</h3>
          <div className="card-actions">{actions}</div>
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-l">{label}</div>
      <div className="stat-v">{value}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

const TONES: Record<string, string> = {
  Paid: 'good', Confirmed: 'good', Resolved: 'good', Approved: 'good', Active: 'good', Yes: 'good',
  Unpaid: 'bad', Rejected: 'bad', Open: 'bad', Inactive: 'muted', No: 'warn',
  'Pending verification': 'warn', Pending: 'warn', 'In progress': 'warn', Requested: 'warn',
}
export function Badge({ children }: { children: string }) {
  return <span className={`badge ${TONES[children] ?? 'muted'}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="card-h">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Horizontal bar list – lightweight chart without a chart library. */
export function Bars({ rows, format }: { rows: { label: string; value: number; tone?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="bars">
      {rows.map(r => (
        <div className="bar-row" key={r.label}>
          <span className="bar-l">{r.label}</span>
          <span className="bar-track">
            <span className={`bar-fill ${r.tone ?? ''}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="bar-v">{format(r.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
