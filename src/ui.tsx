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

// Minimal stroke icon set (24px grid)
const ICONS: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.8-.7-.7-2.8z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  doc: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  check: 'M4 12l5 5L20 6',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v6M18 9v6',
  vendor: 'M3 21V9l9-6 9 6v12M9 21v-7h6v7',
  receipt: 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  calc: 'M5 2h14v20H5zM8 6h8v4H8zM8 14h2M14 14h2M8 18h2M14 18h2',
  alert: 'M12 3l10 18H2zM12 10v4M12 18h.01',
  report: 'M4 4h16v16H4zM8 16v-4M12 16V8M16 16v-6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h0a2 2 0 1 1 0 4z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  building: 'M4 21V3h10v18M14 9h6v12M8 7h2M8 11h2M8 15h2M17 13h0M17 17h0M2 21h20',
  menu: 'M3 6h18M3 12h18M3 18h18',
}
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.doc} />
    </svg>
  )
}
