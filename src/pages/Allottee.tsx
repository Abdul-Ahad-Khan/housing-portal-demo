import { useState } from 'react'
import type { Complaint, Noc, Tenant } from '../data'
import { billTotal, monthName, outstandingFor, pkr, today } from '../data'
import { uid, useStore } from '../store'
import { Badge, Card, Empty, Field, Stat } from '../ui'
import { BillsPanel, NocCertificate } from './shared'
import { TowerView } from '../viz'

export function AllotteeOverview({ aptId, go }: { aptId: string; go: (p: string) => void }) {
  const { state } = useStore()
  const apt = state.apartments.find(a => a.id === aptId)!
  const al = state.allottees.find(a => a.id === apt.allotteeId)!
  const due = outstandingFor(state.bills, aptId)
  const latest = state.bills.filter(b => b.aptId === aptId).sort((a, b) => b.period.localeCompare(a.period))[0]
  const open = state.complaints.filter(c => c.aptId === aptId && c.status !== 'Resolved').length
  const notices = state.notices.filter(n => n.aptId === aptId)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="hello">{greet}, {al.name.split(' ')[0]}</p>
          <h2>Apartment {apt.id}</h2>
          <p className="muted">Tower {apt.tower}, Type {apt.type}, {apt.area.toLocaleString()} sq ft</p>
          <div className={`due ${due ? 'owing' : 'clear'}`}>
            <span className="due-l">{due ? 'Amount due' : 'Balance'}</span>
            <span className="due-v">{pkr(due)}</span>
            <span className="due-s">{due ? `${latest ? monthName(latest.period) : ''} bill due ${latest?.dueDate ?? ''}` : 'All maintenance dues are clear'}</span>
          </div>
          <div className="row-gap">
            {due ? <button className="btn lg" onClick={() => go('bills')}>Pay {pkr(due)}</button> : <button className="btn lg" onClick={() => go('noc')}>Request an NOC</button>}
            <button className="btn ghost lg" onClick={() => go('complaints')}>Report a problem</button>
          </div>
        </div>
        <div className="home-hero-art">
          <TowerView apartments={state.apartments} bills={state.bills} aptId={aptId} />
          <p className="art-key"><i className="dot-me" />Your home <i className="dot-on" />Paid this month <i className="dot-off" />Unpaid</p>
        </div>
      </section>
      <div className="stats">
        <Stat label="Latest bill" value={latest ? pkr(billTotal(latest)) : '—'} sub={latest ? `${monthName(latest.period)}, ${latest.status.toLowerCase()}` : ''} />
        <Stat label="Open complaints" value={open} sub={open ? 'Being handled by the Association' : 'Nothing open'} />
        <Stat label="Registered tenants" value={state.tenants.filter(t => t.aptId === aptId && t.active).length} sub="Tenants can pay bills for this home" />
      </div>
      {notices.length > 0 && (
        <div className="alert">
          <strong>Payment notice:</strong> {notices[notices.length - 1].text}
          <button className="btn sm" onClick={() => go('bills')}>View bills</button>
        </div>
      )}
      <div className="grid2">
        <Card title="My apartment">
          <dl className="kv">
            <dt>Apartment</dt><dd>{apt.id}</dd>
            <dt>Tower / type</dt><dd>{apt.tower} · Type {apt.type}</dd>
            <dt>Covered area</dt><dd>{apt.area.toLocaleString()} sq ft</dd>
            <dt>Possession</dt><dd>{apt.possession}</dd>
            <dt>Allottee</dt><dd>{al.name}</dd>
            <dt>CNIC</dt><dd>{al.cnic}</dd>
          </dl>
        </Card>
        <Card title="Announcements">
          <AnnouncementList limit={3} />
        </Card>
      </div>
    </>
  )
}

export function AnnouncementList({ limit, publicOnly }: { limit?: number; publicOnly?: boolean }) {
  const { state } = useStore()
  const list = state.announcements.filter(a => !publicOnly || a.isPublic).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
  if (!list.length) return <Empty>No announcements.</Empty>
  return (
    <ul className="ann">
      {list.map(a => (
        <li key={a.id}>
          <div className="ann-h"><strong>{a.title}</strong><span className="muted small">{a.date}{!a.isPublic && ' · residents only'}</span></div>
          <p>{a.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function AllotteeBills({ aptId, payer }: { aptId: string; payer: string }) {
  return <BillsPanel aptId={aptId} payer={payer} />
}

export function AllotteeComplaints({ aptId }: { aptId: string }) {
  const { state, act, toast } = useStore()
  const [category, setCategory] = useState('Plumbing')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState('')
  const mine = state.complaints.filter(c => c.aptId === aptId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const submit = () => {
    const c: Complaint = { id: uid('C'), aptId, category, description: description + (file ? ` [attachment: ${file}]` : ''), status: 'Open', comments: [], createdAt: today() }
    act(s => ({ ...s, complaints: [c, ...s.complaints] }))
    setDescription('')
    setFile('')
    toast('Complaint submitted to the Association')
  }
  return (
    <div className="grid2 wide-right">
      <Card title="New complaint">
        <Field label="Category">
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {['Plumbing', 'Electrical', 'Elevator', 'Cleanliness', 'Security', 'Parking', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description"><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue" /></Field>
        <Field label="Photo (optional)"><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0]?.name ?? '')} /></Field>
        <button className="btn" disabled={description.trim().length < 5} onClick={submit}>Submit complaint</button>
      </Card>
      <Card title="My complaints">
        {mine.length === 0 ? <Empty>No complaints yet.</Empty> : (
          <ul className="tickets">
            {mine.map(c => (
              <li key={c.id}>
                <div className="ann-h"><strong>{c.id} · {c.category}</strong><Badge>{c.status}</Badge></div>
                <p>{c.description}</p>
                <div className="muted small">Raised {c.createdAt}{c.assignee ? ` · assigned to ${c.assignee}` : ''}</div>
                {c.comments.map((m, i) => <div key={i} className="comment"><strong>{m.by}:</strong> {m.text} <span className="muted small">{m.at}</span></div>)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function AllotteeTenants({ aptId }: { aptId: string }) {
  const { state, act, toast } = useStore()
  const [f, setF] = useState({ name: '', cnic: '', persons: 1, policeVerified: false, agreement: '' })
  const list = state.tenants.filter(t => t.aptId === aptId)
  const valid = f.name.trim() && /^\d{5}-\d{7}-\d$/.test(f.cnic)
  const add = () => {
    const username = `tenant.${aptId.replace(/-/g, '').toLowerCase()}${list.length ? '.' + (list.length + 1) : ''}`
    const t: Tenant = { id: uid('T'), aptId, name: f.name, cnic: f.cnic, persons: f.persons, policeVerified: f.policeVerified, agreement: f.agreement || undefined, active: true, username, createdAt: today() }
    act(s => ({ ...s, tenants: [...s.tenants, t], users: [...s.users, { id: uid('U'), name: f.name, username, role: 'tenant', active: true }] }))
    setF({ name: '', cnic: '', persons: 1, policeVerified: false, agreement: '' })
    toast(`Tenant account created: ${username}`)
  }
  return (
    <div className="grid2 wide-right">
      <Card title="Register a tenant">
        <p className="muted small">A tenant login is created that can only view and pay maintenance bills for this apartment.</p>
        <Field label="Tenant name"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="CNIC (xxxxx-xxxxxxx-x)"><input value={f.cnic} onChange={e => setF({ ...f, cnic: e.target.value })} placeholder="35202-1234567-1" /></Field>
        <Field label="Number of occupants"><input type="number" min={1} value={f.persons} onChange={e => setF({ ...f, persons: Number(e.target.value) })} /></Field>
        <label className="check"><input type="checkbox" checked={f.policeVerified} onChange={e => setF({ ...f, policeVerified: e.target.checked })} /> Police verification completed</label>
        <Field label="Rental agreement (optional)"><input type="file" accept=".pdf,image/*" onChange={e => setF({ ...f, agreement: e.target.files?.[0]?.name ?? '' })} /></Field>
        <button className="btn" disabled={!valid} onClick={add}>Register tenant</button>
      </Card>
      <Card title="Tenants">
        {list.length === 0 ? <Empty>No tenants registered.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>CNIC</th><th>Persons</th><th>Police</th><th>Login</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id}>
                    <td>{t.name}{t.agreement && <div className="muted small">📎 {t.agreement}</div>}</td>
                    <td>{t.cnic}</td>
                    <td>{t.persons}</td>
                    <td><Badge>{t.policeVerified ? 'Yes' : 'No'}</Badge></td>
                    <td className="mono">{t.username}</td>
                    <td><Badge>{t.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="actions">
                      {t.active && <button className="btn sm ghost" onClick={() => { act(s => ({ ...s, tenants: s.tenants.map(x => x.id === t.id ? { ...x, active: false } : x), users: s.users.map(u => u.username === t.username ? { ...u, active: false } : u) })); toast('Tenancy ended – login deactivated') }}>End tenancy</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function AllotteeNoc({ aptId }: { aptId: string }) {
  const { state, act, toast } = useStore()
  const [reason, setReason] = useState('Sale of apartment')
  const [view, setView] = useState<string | null>(null)
  const due = outstandingFor(state.bills, aptId)
  const pendingSlips = state.payments.some(p => p.aptId === aptId && p.status === 'Pending')
  const list = state.nocs.filter(n => n.aptId === aptId)
  const hasOpen = list.some(n => n.status === 'Requested')
  const eligible = due === 0 && !pendingSlips && !hasOpen
  const request = () => {
    const n: Noc = { id: uid('NOC'), aptId, requestedAt: today(), reason, status: 'Requested' }
    act(s => ({ ...s, nocs: [...s.nocs, n] }))
    toast('NOC request sent to the Authority')
  }
  return (
    <div className="grid2 wide-right">
      <Card title="Request NOC (all dues clear)">
        <p className="muted small">Needed for transfer or sale of the apartment. The system checks all bills and payments before the request reaches the Authority.</p>
        <div className={`check-line ${due === 0 ? 'ok' : 'no'}`}>{due === 0 ? '✓' : '✕'} Outstanding dues: {pkr(due)}</div>
        <div className={`check-line ${!pendingSlips ? 'ok' : 'no'}`}>{!pendingSlips ? '✓' : '✕'} No payments awaiting verification</div>
        <div className={`check-line ${!hasOpen ? 'ok' : 'no'}`}>{!hasOpen ? '✓' : '✕'} No open NOC request</div>
        <Field label="Purpose">
          <select value={reason} onChange={e => setReason(e.target.value)}>
            <option>Sale of apartment</option>
            <option>Transfer to family member</option>
            <option>Other transfer</option>
          </select>
        </Field>
        <button className="btn" disabled={!eligible} onClick={request}>Request NOC</button>
        {!eligible && due > 0 && <p className="muted small">Clear outstanding bills first.</p>}
      </Card>
      <Card title="My NOC requests">
        {list.length === 0 ? <Empty>No requests yet.</Empty> : (
          <table>
            <thead><tr><th>Requested</th><th>Purpose</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map(n => (
                <tr key={n.id}>
                  <td>{n.requestedAt}</td>
                  <td>{n.reason}</td>
                  <td><Badge>{n.status}</Badge></td>
                  <td className="actions">{n.status === 'Approved' && <button className="btn sm" onClick={() => setView(n.id)}>View certificate</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {view && <NocCertificate nocId={view} onClose={() => setView(null)} />}
    </div>
  )
}

export function AllotteeNotices({ aptId }: { aptId: string }) {
  const { state } = useStore()
  const notices = state.notices.filter(n => n.aptId === aptId).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="grid2">
      <Card title="Notices to me">
        {notices.length === 0 ? <Empty>No notices.</Empty> : (
          <ul className="ann">{notices.map(n => <li key={n.id}><div className="ann-h"><strong>Unpaid bill notice</strong><span className="muted small">{n.date}</span></div><p>{n.text}</p></li>)}</ul>
        )}
      </Card>
      <Card title="Announcements"><AnnouncementList /></Card>
    </div>
  )
}
