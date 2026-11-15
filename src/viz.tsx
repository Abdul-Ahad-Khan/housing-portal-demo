import { useMemo } from 'react'
import type { Apartment, Bill } from './data'

// Geometry shared by the skyline drawings
const WIN = 3 // window size
const GAP = 1.6 // gap between windows
const PAD = 2.4 // tower wall padding
const FLOOR = WIN + GAP

const parseUnit = (id: string) => {
  const part = id.split('-')[2]
  return { floor: Number(part.slice(0, -2)), unit: Number(part.slice(-2)) }
}

function latestStatus(bills: Bill[]) {
  const latest = bills.reduce((m, b) => (b.period > m ? b.period : m), '')
  const paid = new Set(bills.filter(b => b.period === latest && b.status === 'Paid').map(b => b.aptId))
  return { latest, paid }
}

/** The whole project as a skyline: one window per apartment, lit when the latest bill is paid.
 *  rows > 1 stacks the towers into receding streets so the drawing fits a squarer space. */
export function Skyline({ apartments, bills, highlight, rows = 1 }: { apartments: Apartment[]; bills: Bill[]; highlight?: string; rows?: number }) {
  const { paid } = useMemo(() => latestStatus(bills), [bills])
  const towers = useMemo(() => {
    const m = new Map<string, Apartment[]>()
    apartments.forEach(a => m.set(a.tower, [...(m.get(a.tower) ?? []), a]))
    // interleave types so each street mixes 7-floor (B) and 12-floor (E) towers
    const b = [...m.entries()].filter(([t]) => t.startsWith('B'))
    const e = [...m.entries()].filter(([t]) => t.startsWith('E'))
    const out: [string, Apartment[]][] = []
    let bi = 0
    let ei = 0
    while (bi < b.length || ei < e.length) {
      if (bi < b.length) out.push(b[bi++])
      if (ei < e.length) out.push(e[ei++])
      if (bi < b.length) out.push(b[bi++])
    }
    return out
  }, [apartments])

  const tw = PAD * 2 + 4 * WIN + 3 * GAP
  const tgap = 4
  const perRow = Math.ceil(towers.length / rows)
  const towerH = 12 * FLOOR + PAD * 2 + 6
  const rowStep = towerH * 0.62
  const width = perRow * (tw + tgap) + (rows - 1) * (tw / 2)
  const height = towerH + (rows - 1) * rowStep + 4
  const streets = Array.from({ length: rows }, (_, r) => towers.slice(r * perRow, (r + 1) * perRow))
  return (
    <svg className="skyline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Project skyline: lit windows are apartments whose latest bill is paid">
      {streets.map((street, r) => {
        const base = towerH + r * rowStep
        const shift = (rows - 1 - r) * (tw / 2)
        return (
          <g key={r} className={`street s${rows - 1 - r}`}>
            <rect x="0" y={base} width={width} height={height - base} className="sky-fill" />
            <line x1="0" x2={width} y1={base} y2={base} className="sky-ground" />
            {street.map(([tower, apts], i) => {
              const floors = Math.max(...apts.map(a => parseUnit(a.id).floor))
              const h = floors * FLOOR + PAD * 2 + 3
              const x = shift + i * (tw + tgap)
              const y = base - h
              return (
                <g key={tower}>
                  <title>{tower}</title>
                  <rect x={x} y={y} width={tw} height={h} rx="1" className={`sky-tower ${tower.startsWith('E') ? 'e' : 'b'}`} />
                  {apts.map(a => {
                    const { floor, unit } = parseUnit(a.id)
                    const wx = x + PAD + (unit - 1) * (WIN + GAP)
                    const wy = base - PAD - floor * FLOOR
                    const cls = a.id === highlight ? 'win me' : paid.has(a.id) ? 'win on' : 'win'
                    return <rect key={a.id} x={wx} y={wy} width={WIN} height={WIN} className={cls} />
                  })}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/** One tower, drawn large, with the allottee's apartment marked. */
export function TowerView({ apartments, bills, aptId }: { apartments: Apartment[]; bills: Bill[]; aptId: string }) {
  const tower = aptId.split('-').slice(0, 2).join('-')
  const apts = apartments.filter(a => a.tower === tower)
  const { paid } = latestStatus(bills)
  const floors = Math.max(...apts.map(a => parseUnit(a.id).floor))
  const S = 15
  const G = 5
  const P = 10
  const w = P * 2 + 4 * S + 3 * G
  const h = P * 2 + floors * (S + G) + 12
  const me = parseUnit(aptId)
  return (
    <svg className="tower-view" viewBox={`-34 -18 ${w + 46} ${h + 26}`} role="img" aria-label={`Tower ${tower}, apartment ${aptId} highlighted`}>
      <rect x="0" y="0" width={w} height={h} rx="3" className="sky-tower b" />
      <rect x={w / 2 - 9} y={h - 18} width="18" height="18" rx="2" className="tv-door" />
      {apts.map(a => {
        const { floor, unit } = parseUnit(a.id)
        const x = P + (unit - 1) * (S + G)
        const y = h - 22 - floor * (S + G)
        const cls = a.id === aptId ? 'win me' : paid.has(a.id) ? 'win on' : 'win'
        return <rect key={a.id} x={x} y={y} width={S} height={S} rx="1.5" className={cls} />
      })}
      {Array.from({ length: floors }, (_, i) => (
        <text key={i} x="-8" y={h - 22 - (i + 1) * (S + G) + S - 3} className="tv-floor" textAnchor="end">{i + 1}</text>
      ))}
      <text x={w / 2} y="-6" className="tv-label" textAnchor="middle">Tower {tower}</text>
      <line x1={P + (me.unit - 1) * (S + G) + S} y1={h - 22 - me.floor * (S + G) + S / 2} x2={w + 6} y2={h - 22 - me.floor * (S + G) + S / 2} className="tv-pointer" />
    </svg>
  )
}

/** Collection rate per tower for the latest bill period, as a grid of tiles. */
export function TowerHeat({ apartments, bills, onPick }: { apartments: Apartment[]; bills: Bill[]; onPick?: (tower: string) => void }) {
  const { latest } = latestStatus(bills)
  const rows = useMemo(() => {
    const m = new Map<string, { n: number; paid: number }>()
    bills.filter(b => b.period === latest).forEach(b => {
      const t = b.aptId.split('-').slice(0, 2).join('-')
      const r = m.get(t) ?? { n: 0, paid: 0 }
      r.n++
      if (b.status === 'Paid') r.paid++
      m.set(t, r)
    })
    return [...new Set(apartments.map(a => a.tower))].map(t => ({ tower: t, ...(m.get(t) ?? { n: 0, paid: 0 }) }))
  }, [apartments, bills, latest])
  const tone = (p: number) => (p >= 0.8 ? 'h4' : p >= 0.65 ? 'h3' : p >= 0.5 ? 'h2' : 'h1')
  return (
    <div className="heat">
      {(['B', 'E'] as const).map(type => (
        <div key={type} className="heat-group">
          <div className="heat-h">Type {type}</div>
          <div className="heat-grid">
            {rows.filter(r => r.tower.startsWith(type)).map(r => {
              const p = r.n ? r.paid / r.n : 0
              return (
                <button key={r.tower} className={`heat-tile ${tone(p)}`} title={`${r.tower}: ${r.paid} of ${r.n} paid`} onClick={() => onPick?.(r.tower)}>
                  <span className="heat-t">{r.tower.slice(2)}</span>
                  <span className="heat-p">{Math.round(p * 100)}%</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="heat-key">
        <span><i className="h1" />under 50%</span>
        <span><i className="h2" />50–64%</span>
        <span><i className="h3" />65–79%</span>
        <span><i className="h4" />80% or more</span>
      </div>
    </div>
  )
}

/** Simple ring showing a share. */
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={`${label}: ${Math.round(value * 100)}%`}>
      <circle cx="60" cy="60" r={r} className="ring-bg" />
      <circle cx="60" cy="60" r={r} className="ring-fg" strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="62" textAnchor="middle" className="ring-v">{Math.round(value * 100)}%</text>
      <text x="60" y="80" textAnchor="middle" className="ring-l">{label}</text>
    </svg>
  )
}
