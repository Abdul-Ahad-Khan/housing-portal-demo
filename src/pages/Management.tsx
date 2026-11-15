import { useMemo, useState } from 'react'
import type { Announcement, Bill, Notice, Role, State } from '../data'
import { billTotal, dueDateFor, monthName, pkr, today } from '../data'
import { uid, useStore } from '../store'
import { Badge, Bars, Card, Empty, Field, Stat, downloadCsv } from '../ui'
import { NocCertificate } from './shared'
import { Ring, TowerHeat } from '../viz'

function useFinance(state: State) {
  return useMemo(() => {
    const billed = state.bills.reduce((s, b) => s + billTotal(b), 0)
    const confirmed = state.payments.filter(p => p.status === 'Confirmed')
    const collected = confirmed.reduce((s, p) => s + p.amount, 0)
    const outstanding = state.bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + billTotal(b), 0)
    const outByApt = new Map<string, number>()
    state.bills.filter(b => b.status === 'Unpaid').forEach(b => outByApt.set(b.aptId, (outByApt.get(b.aptId) ?? 0) + billTotal(b)))
    const expense = state.expenses.filter(e => e.kind === 'Expense').reduce((s, e) => s + e.amount, 0)
    const transfers = state.expenses.filter(e => e.kind === 'Transfer to Authority').reduce((s, e) => s + e.amount, 0)
    return { billed, collected, outstanding, outByApt, expense, transfers, confirmed }
  }, [state])
}

export function ManagementDashboard() {
  const { state } = useStore()
  const f = useFinance(state)
  const periods = [...new Set(state.bills.map(b => b.period))].sort()
  const latestPeriod = periods[periods.length - 1]
  const byPeriod = periods.map(p => {
    const bs = state.bills.filter(b => b.period === p)
    const paid = bs.filter(b => b.status === 'Paid').length
    return { label: monthName(p).replace(' 2026', ''), value: Math.round((paid / bs.length) * 100), tone: paid / bs.length > 0.8 ? 'good' : 'warn' }
  })
  const methods = ['Cash', 'Online transfer', 'Direct deposit', 'Payment gateway'].map(m => ({ label: m, value: f.confirmed.filter(p => p.method === m).reduce((s, p) => s + p.amount, 0) }))
  const byType = (['B', 'E'] as const).map(t => {
    const bs = state.bills.filter(b => b.aptId.startsWith(t + '-'))
    return { label: `Type ${t} outstanding`, value: bs.filter(b => b.status !== 'Paid').reduce((s, b) => s + billTotal(b), 0), tone: 'bad' }
  })
  const cats = [...new Set(state.expenses.filter(e => e.kind === 'Expense').map(e => e.category))].map(c => ({ label: c, value: state.expenses.filter(e => e.kind === 'Expense' && e.category === c).reduce((s, e) => s + e.amount, 0) }))
  const openComplaints = state.complaints.filter(c => c.status !== 'Resolved').length
  return (
    <>
      <div className="stats">
        <Stat label="Total billed" value={pkr(f.billed)} sub={`${state.bills.length.toLocaleString()} bills · ${state.apartments.length.toLocaleString()} apartments`} />
        <Stat label="Collected" value={pkr(f.collected)} tone="good" sub={`${Math.round((f.collected / f.billed) * 100)}% collection rate`} />
        <Stat label="Outstanding" value={pkr(f.outstanding)} tone="bad" sub={`${f.outByApt.size.toLocaleString()} apartments with dues`} />
        <Stat label="Open complaints" value={openComplaints} sub={`${state.nocs.filter(n => n.status === 'Requested').length} NOC requests pending`} />
      </div>
      <div className="grid2 wide-left">
        <Card title={`Bills paid by tower, ${monthName(latestPeriod)}`}>
          <TowerHeat apartments={state.apartments} bills={state.bills} />
        </Card>
        <Card title="Collection rate">
          <div className="ring-wrap"><Ring value={f.collected / f.billed} label="of all billing" /></div>
          <Bars rows={byPeriod} format={n => `${n}%`} />
        </Card>
      </div>
      <div className="grid3">
        <Card title="Collections by payment channel"><Bars rows={methods} format={pkr} /></Card>
        <Card title="Outstanding by apartment type"><Bars rows={byType} format={pkr} /></Card>
        <Card title="Site expenditure by category"><Bars rows={cats} format={pkr} /></Card>
      </div>
      <Card title="Funds summary">
        <dl className="kv wide">
          <dt>Maintenance collected</dt><dd>{pkr(f.collected)}</dd>
          <dt>Site expenditure (vendors, petty cash, repairs, utilities)</dt><dd>− {pkr(f.expense)}</dd>
          <dt>Transferred by Association to Authority</dt><dd>− {pkr(f.transfers)}</dd>
          <dt><strong>Balance held by Association</strong></dt><dd><strong>{pkr(f.collected - f.expense - f.transfers)}</strong></dd>
        </dl>
      </Card>
    </>
  )
}

export function BillRun() {
  const { state, act, toast } = useStore()
  const [period, setPeriod] = useState('2026-11')
  const [scope, setScope] = useState<'all' | 'B' | 'E' | 'towers' | 'apt'>('all')
  const [towers, setTowers] = useState<string[]>([])
  const [apt, setApt] = useState('')
  const towerList = [...new Set(state.apartments.map(a => a.tower))]
  const existing = new Set(state.bills.filter(b => b.period === period).map(b => b.aptId))
  const selected = state.apartments.filter(a =>
    scope === 'all' ? true : scope === 'B' || scope === 'E' ? a.type === scope : scope === 'towers' ? towers.includes(a.tower) : a.id.toLowerCase() === apt.trim().toLowerCase(),
  )
  const toBill = selected.filter(a => !existing.has(a.id))
  const rate = (t: 'B' | 'E') => (t === 'B' ? state.settings.rateB : state.settings.rateE)
  const total = toBill.reduce((s, a) => s + rate(a.type), 0)

  const overdue = state.bills.filter(b => b.status === 'Unpaid' && b.surcharge === 0 && Date.parse(b.dueDate) + state.settings.graceDays * 864e5 < Date.now())

  return (
    <div className="grid2 wide-right">
      <Card title="Generate maintenance bills">
        <Field label="Billing period"><input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></Field>
        <Field label="Select allottees">
          <select value={scope} onChange={e => setScope(e.target.value as typeof scope)}>
            <option value="all">All apartments</option>
            <option value="B">All Type B</option>
            <option value="E">All Type E</option>
            <option value="towers">Selected towers</option>
            <option value="apt">Single apartment</option>
          </select>
        </Field>
        {scope === 'towers' && (
          <div className="tower-grid">
            {towerList.map(t => (
              <label key={t} className={`chip ${towers.includes(t) ? 'on' : ''}`}>
                <input type="checkbox" checked={towers.includes(t)} onChange={e => setTowers(e.target.checked ? [...towers, t] : towers.filter(x => x !== t))} />{t}
              </label>
            ))}
          </div>
        )}
        {scope === 'apt' && <Field label="Apartment"><input value={apt} onChange={e => setApt(e.target.value)} placeholder="B-07-302" /></Field>}
        <p className="muted small">Rates: Type B {pkr(state.settings.rateB)} · Type E {pkr(state.settings.rateE)} per month (Settings).</p>
      </Card>
      <Card title="Preview before issue">
        <div className="stats">
          <Stat label="Apartments selected" value={selected.length.toLocaleString()} />
          <Stat label="Already billed (skipped)" value={(selected.length - toBill.length).toLocaleString()} />
          <Stat label="New bills" value={toBill.length.toLocaleString()} />
          <Stat label="Total amount" value={pkr(total)} />
        </div>
        <p className="muted small">Due date: {dueDateFor(period)}. Bills appear immediately in each allottee and tenant dashboard.</p>
        <button className="btn" disabled={!toBill.length} onClick={() => {
          const bills: Bill[] = toBill.map(a => ({ id: `BL-${period}-${a.id}`, aptId: a.id, period, amount: rate(a.type), surcharge: 0, dueDate: dueDateFor(period), status: 'Unpaid', issuedOn: today() }))
          act(s => ({ ...s, bills: [...s.bills, ...bills] }))
          toast(`${bills.length.toLocaleString()} bills issued for ${monthName(period)}`)
        }}>Issue {toBill.length.toLocaleString()} bills</button>

        <hr />
        <h4>Late payment surcharge</h4>
        <p className="muted small">{state.settings.surchargePct}% on unpaid bills past due date + {state.settings.graceDays} grace days.</p>
        <button className="btn ghost" disabled={!overdue.length} onClick={() => {
          const ids = new Set(overdue.map(b => b.id))
          act(s => ({ ...s, bills: s.bills.map(b => (ids.has(b.id) ? { ...b, surcharge: Math.round((b.amount * s.settings.surchargePct) / 100) } : b)) }))
          toast(`Surcharge applied to ${overdue.length} overdue bills`)
        }}>Apply surcharge to {overdue.length.toLocaleString()} overdue bills</button>
      </Card>
    </div>
  )
}

export function Defaulters() {
  const { state, act, toast } = useStore()
  const f = useFinance(state)
  const rows = [...f.outByApt.entries()].sort((a, b) => b[1] - a[1])
  const name = (aptId: string) => state.allottees.find(a => a.aptId === aptId)?.name ?? ''
  const issue = () => {
    const d = today()
    const ns: Notice[] = rows.map(([aptId, amt]) => ({ id: uid('N'), aptId, date: d, text: `Your maintenance dues of ${pkr(amt)} are outstanding. Please pay within 7 days to avoid further surcharge.` }))
    act(s => ({ ...s, notices: [...s.notices, ...ns] }))
    toast(`${ns.length.toLocaleString()} notices issued to allottee dashboards`)
  }
  return (
    <Card title={`Unpaid bills – ${rows.length.toLocaleString()} apartments`} actions={<>
      <button className="btn sm ghost" onClick={() => downloadCsv('defaulters.csv', [['Apartment', 'Allottee', 'Outstanding'], ...rows.map(([a, v]) => [a, name(a), v])])}>Export CSV</button>
      <button className="btn sm" disabled={!rows.length} onClick={issue}>Issue notices to all</button>
    </>}>
      {rows.length === 0 ? <Empty>No unpaid bills.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Apartment</th><th>Allottee</th><th>Unpaid bills</th><th className="num">Outstanding</th><th>Notices</th></tr></thead>
            <tbody>
              {rows.slice(0, 100).map(([aptId, amt]) => (
                <tr key={aptId}>
                  <td>{aptId}</td><td>{name(aptId)}</td>
                  <td>{state.bills.filter(b => b.aptId === aptId && b.status === 'Unpaid').map(b => monthName(b.period).split(' ')[0].slice(0, 3)).join(', ')}</td>
                  <td className="num">{pkr(amt)}</td>
                  <td>{state.notices.filter(n => n.aptId === aptId).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && <p className="muted small">Showing top 100 by amount. Export for the full list.</p>}
        </div>
      )}
    </Card>
  )
}

export function NocApprovals() {
  const { state, act, toast } = useStore()
  const [view, setView] = useState<string | null>(null)
  const list = [...state.nocs].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  return (
    <Card title="NOC / transfer requests">
      {list.length === 0 ? <Empty>No NOC requests yet. Log in as the allottee and request one after clearing dues.</Empty> : (
        <table>
          <thead><tr><th>Requested</th><th>Apartment</th><th>Allottee</th><th>Purpose</th><th>Dues check</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map(n => {
              const out = state.bills.filter(b => b.aptId === n.aptId && b.status !== 'Paid').reduce((s, b) => s + billTotal(b), 0)
              return (
                <tr key={n.id}>
                  <td>{n.requestedAt}</td><td>{n.aptId}</td><td>{state.allottees.find(a => a.aptId === n.aptId)?.name}</td><td>{n.reason}</td>
                  <td><Badge>{out === 0 ? 'Yes' : 'No'}</Badge> <span className="small muted">{out === 0 ? 'All dues clear' : pkr(out)}</span></td>
                  <td><Badge>{n.status}</Badge></td>
                  <td className="actions">
                    {n.status === 'Requested' && <>
                      <button className="btn sm" disabled={out > 0} onClick={() => { act(s => ({ ...s, nocs: s.nocs.map(x => x.id === n.id ? { ...x, status: 'Approved', decidedAt: today(), certNo: `NOC-${new Date().getFullYear()}-${String(s.nocs.filter(y => y.certNo).length + 1).padStart(4, '0')}` } : x) })); toast('NOC approved and certificate generated') }}>Approve</button>
                      <button className="btn sm ghost danger" onClick={() => act(s => ({ ...s, nocs: s.nocs.map(x => x.id === n.id ? { ...x, status: 'Rejected', decidedAt: today() } : x) }))}>Reject</button>
                    </>}
                    {n.status === 'Approved' && <button className="btn sm ghost" onClick={() => setView(n.id)}>Certificate</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {view && <NocCertificate nocId={view} onClose={() => setView(null)} />}
    </Card>
  )
}

export function Announcements() {
  const { state, act, toast } = useStore()
  const [a, setA] = useState({ title: '', body: '', isPublic: true })
  return (
    <div className="grid2 wide-right">
      <Card title="New announcement">
        <Field label="Title"><input value={a.title} onChange={e => setA({ ...a, title: e.target.value })} /></Field>
        <Field label="Message"><textarea rows={5} value={a.body} onChange={e => setA({ ...a, body: e.target.value })} /></Field>
        <label className="check"><input type="checkbox" checked={a.isPublic} onChange={e => setA({ ...a, isPublic: e.target.checked })} /> Also show on public notice board</label>
        <button className="btn" disabled={!a.title || !a.body} onClick={() => {
          const n: Announcement = { ...a, id: uid('AN'), date: today() }
          act(s => ({ ...s, announcements: [n, ...s.announcements] }))
          setA({ title: '', body: '', isPublic: true })
          toast('Announcement published')
        }}>Publish</button>
      </Card>
      <Card title="Published">
        <ul className="ann">
          {[...state.announcements].sort((x, y) => y.date.localeCompare(x.date)).map(x => (
            <li key={x.id}>
              <div className="ann-h"><strong>{x.title}</strong><span className="row-gap"><Badge>{x.isPublic ? 'Public' : 'Residents'}</Badge><button className="btn sm ghost" onClick={() => act(s => ({ ...s, announcements: s.announcements.filter(y => y.id !== x.id) }))}>Remove</button></span></div>
              <p>{x.body}</p><span className="muted small">{x.date}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function Reports() {
  const { state } = useStore()
  const [tab, setTab] = useState<'collections' | 'expenditure' | 'statement'>('collections')
  const [from, setFrom] = useState('2026-08-01')
  const [to, setTo] = useState(today())
  const inRange = (d: string) => d >= from && d <= to
  const pays = state.payments.filter(p => p.status === 'Confirmed' && inRange(p.at)).sort((a, b) => a.at.localeCompare(b.at))
  const exps = state.expenses.filter(e => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date))
  const income = pays.reduce((s, p) => s + p.amount, 0)
  const spend = exps.filter(e => e.kind === 'Expense').reduce((s, e) => s + e.amount, 0)
  const transfers = exps.filter(e => e.kind === 'Transfer to Authority').reduce((s, e) => s + e.amount, 0)
  const months = [...new Set([...pays.map(p => p.at.slice(0, 7)), ...exps.map(e => e.date.slice(0, 7))])].sort()

  const exportIt = () => {
    if (tab === 'collections') downloadCsv(`collections_${from}_${to}.csv`, [['Date', 'Receipt', 'Apartment', 'Method', 'Reference', 'Amount', 'Recorded by'], ...pays.map(p => [p.at, p.receiptNo ?? '', p.aptId, p.method, p.ref, p.amount, p.by])])
    else if (tab === 'expenditure') downloadCsv(`expenditure_${from}_${to}.csv`, [['Date', 'Type', 'Category', 'Description', 'Reference', 'Amount', 'Entered by'], ...exps.map(e => [e.date, e.kind, e.category, e.description, e.ref, e.amount, e.by])])
    else downloadCsv(`statement_${from}_${to}.csv`, [['Month', 'Collections', 'Expenditure', 'Transfers to Authority', 'Net'], ...months.map(m => { const i = pays.filter(p => p.at.startsWith(m)).reduce((s, p) => s + p.amount, 0); const e = exps.filter(x => x.kind === 'Expense' && x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0); const t = exps.filter(x => x.kind === 'Transfer to Authority' && x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0); return [m, i, e, t, i - e - t] })])
  }

  return (
    <Card title="Auditable reports" actions={<button className="btn sm" onClick={exportIt}>Export CSV</button>}>
      <div className="tabs">
        {(['collections', 'expenditure', 'statement'] as const).map(t => <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t === 'collections' ? 'Collections ledger' : t === 'expenditure' ? 'Expenditure ledger' : 'Income vs expenditure'}</button>)}
        <span className="spacer" />
        <label className="inline-f">From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="inline-f">To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <p className="muted small">Every entry carries who recorded it and when. Entries are append-only; corrections are posted as reversals.</p>
      {tab === 'collections' && (
        <div className="table-wrap tall">
          <table>
            <thead><tr><th>Date</th><th>Receipt</th><th>Apartment</th><th>Method</th><th>Reference</th><th>Recorded by</th><th className="num">Amount</th></tr></thead>
            <tbody>{pays.slice(-200).reverse().map(p => <tr key={p.id}><td>{p.at}</td><td className="mono small">{p.receiptNo}</td><td>{p.aptId}</td><td>{p.method}</td><td className="mono small">{p.ref || '—'}</td><td>{p.by}</td><td className="num">{pkr(p.amount)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={6}>{pays.length.toLocaleString()} receipts (latest 200 shown)</td><td className="num"><strong>{pkr(income)}</strong></td></tr></tfoot>
          </table>
        </div>
      )}
      {tab === 'expenditure' && (
        <div className="table-wrap tall">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Ref</th><th>Entered by</th><th className="num">Amount</th></tr></thead>
            <tbody>{exps.map(e => <tr key={e.id}><td>{e.date}</td><td>{e.kind}</td><td>{e.category}</td><td>{e.description}</td><td className="mono small">{e.ref}</td><td>{e.by}</td><td className="num">{pkr(e.amount)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={6}>Total</td><td className="num"><strong>{pkr(spend + transfers + exps.filter(e => e.kind === 'Petty cash top-up').reduce((s, e) => s + e.amount, 0))}</strong></td></tr></tfoot>
          </table>
        </div>
      )}
      {tab === 'statement' && (
        <table>
          <thead><tr><th>Month</th><th className="num">Collections</th><th className="num">Expenditure</th><th className="num">Transfers to Authority</th><th className="num">Net</th></tr></thead>
          <tbody>
            {months.map(m => {
              const i = pays.filter(p => p.at.startsWith(m)).reduce((s, p) => s + p.amount, 0)
              const e = exps.filter(x => x.kind === 'Expense' && x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0)
              const t = exps.filter(x => x.kind === 'Transfer to Authority' && x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0)
              return <tr key={m}><td>{monthName(m)}</td><td className="num">{pkr(i)}</td><td className="num">{pkr(e)}</td><td className="num">{pkr(t)}</td><td className="num"><strong>{pkr(i - e - t)}</strong></td></tr>
            })}
          </tbody>
          <tfoot><tr><td>Total</td><td className="num">{pkr(income)}</td><td className="num">{pkr(spend)}</td><td className="num">{pkr(transfers)}</td><td className="num"><strong>{pkr(income - spend - transfers)}</strong></td></tr></tfoot>
        </table>
      )}
    </Card>
  )
}

export function SettingsPage() {
  const { state, act, toast } = useStore()
  const [s, setS] = useState(state.settings)
  return (
    <Card title="Billing rules" className="narrow">
      <Field label="Type B monthly rate (PKR)"><input type="number" value={s.rateB} onChange={e => setS({ ...s, rateB: Number(e.target.value) })} /></Field>
      <Field label="Type E monthly rate (PKR)"><input type="number" value={s.rateE} onChange={e => setS({ ...s, rateE: Number(e.target.value) })} /></Field>
      <Field label="Late surcharge (%)"><input type="number" value={s.surchargePct} onChange={e => setS({ ...s, surchargePct: Number(e.target.value) })} /></Field>
      <Field label="Grace days after due date"><input type="number" value={s.graceDays} onChange={e => setS({ ...s, graceDays: Number(e.target.value) })} /></Field>
      <button className="btn" onClick={() => { act(x => ({ ...x, settings: s })); toast('Billing rules saved – apply to the next bill run') }}>Save</button>
    </Card>
  )
}

export function AdminUsers() {
  const { state, act, toast } = useStore()
  const [u, setU] = useState({ name: '', username: '', role: 'association' as Role })
  const roles: Role[] = ['allottee', 'tenant', 'association', 'management', 'admin']
  const counts = roles.map(r => ({ label: r[0].toUpperCase() + r.slice(1), value: state.users.filter(x => x.role === r).length }))
  return (
    <>
      <div className="stats">
        <Stat label="Apartments" value={state.apartments.length.toLocaleString()} sub="672 Type B · 912 Type E" />
        <Stat label="Towers" value={new Set(state.apartments.map(a => a.tower)).size} sub="24 Type B · 19 Type E" />
        <Stat label="Portal users" value={state.users.length} sub={counts.map(c => `${c.value} ${c.label}`).join(' · ')} />
        <Stat label="Active tenants" value={state.tenants.filter(t => t.active).length} />
      </div>
      <div className="grid2 wide-right">
        <Card title="Create staff account">
          <Field label="Full name"><input value={u.name} onChange={e => setU({ ...u, name: e.target.value })} /></Field>
          <Field label="Username"><input value={u.username} onChange={e => setU({ ...u, username: e.target.value })} /></Field>
          <Field label="Role"><select value={u.role} onChange={e => setU({ ...u, role: e.target.value as Role })}>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
          <button className="btn" disabled={!u.name || !u.username} onClick={() => { act(s => ({ ...s, users: [...s.users, { ...u, id: uid('U'), active: true }] })); setU({ name: '', username: '', role: 'association' }); toast('Account created – temporary password sent') }}>Create account</button>
        </Card>
        <Card title="Users and rights">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {state.users.map(x => (
                  <tr key={x.id}>
                    <td>{x.name}</td><td className="mono">{x.username}</td>
                    <td><select value={x.role} onChange={e => act(s => ({ ...s, users: s.users.map(y => y.id === x.id ? { ...y, role: e.target.value as Role } : y) }))}>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></td>
                    <td><Badge>{x.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="actions">
                      <button className="btn sm ghost" onClick={() => act(s => ({ ...s, users: s.users.map(y => y.id === x.id ? { ...y, active: !y.active } : y) }))}>{x.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="btn sm ghost" onClick={() => toast(`Password reset link sent to ${x.username}`)}>Reset password</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}

export function Apartments() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const list = state.apartments.filter(a => !q || a.id.toLowerCase().includes(q.toLowerCase()) || state.allottees.find(x => x.id === a.allotteeId)?.name.toLowerCase().includes(q.toLowerCase())).slice(0, 80)
  return (
    <Card title="Apartments & allottees" actions={<input className="search" placeholder="Search apartment or name" value={q} onChange={e => setQ(e.target.value)} />}>
      <div className="table-wrap tall">
        <table>
          <thead><tr><th>Apartment</th><th>Type</th><th className="num">Area (sq ft)</th><th>Allottee</th><th>CNIC</th><th>Phone</th><th>Possession</th></tr></thead>
          <tbody>
            {list.map(a => { const al = state.allottees.find(x => x.id === a.allotteeId)!; return <tr key={a.id}><td>{a.id}</td><td>{a.type}</td><td className="num">{a.area.toLocaleString()}</td><td>{al.name}</td><td className="mono small">{al.cnic}</td><td className="mono small">{al.phone}</td><td>{a.possession}</td></tr> })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Showing up to 80 of {state.apartments.length.toLocaleString()}.</p>
    </Card>
  )
}
