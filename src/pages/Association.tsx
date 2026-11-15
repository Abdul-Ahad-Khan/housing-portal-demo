import { useMemo, useState } from 'react'
import type { Expense, Payment, Vendor } from '../data'
import { billTotal, monthName, pkr, today } from '../data'
import { uid, useStore } from '../store'
import { Badge, Card, Empty, Field, Modal, Stat } from '../ui'
import { confirmPayment, Receipt } from './shared'

export function pettyBalance(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + (e.kind === 'Petty cash top-up' ? e.amount : e.category === 'Petty cash' ? -e.amount : 0), 0)
}

export function AssociationOverview({ go }: { go: (p: string) => void }) {
  const { state } = useStore()
  const pending = state.payments.filter(p => p.status === 'Pending').length
  const open = state.complaints.filter(c => c.status !== 'Resolved').length
  const cashToday = state.payments.filter(p => p.method === 'Cash' && p.at === today()).reduce((s, p) => s + p.amount, 0)
  return (
    <>
      <div className="stats">
        <Stat label="Slips awaiting verification" value={pending} tone={pending ? 'warn' : 'good'} />
        <Stat label="Open complaints" value={open} tone={open ? 'warn' : 'good'} />
        <Stat label="Cash collected today" value={pkr(cashToday)} />
        <Stat label="Petty cash balance" value={pkr(pettyBalance(state.expenses))} />
      </div>
      <div className="quick">
        <button className="btn" onClick={() => go('verify')}>Verify payment slips</button>
        <button className="btn ghost" onClick={() => go('cash')}>Record cash payment</button>
        <button className="btn ghost" onClick={() => go('complaints')}>Complaint queue</button>
        <button className="btn ghost" onClick={() => go('expenses')}>Add expense</button>
      </div>
    </>
  )
}

export function VerifyQueue() {
  const { state, act, toast } = useStore()
  const [reject, setReject] = useState<Payment | null>(null)
  const [reason, setReason] = useState('Amount does not match bank record')
  const queue = state.payments.filter(p => p.status === 'Pending').sort((a, b) => b.at.localeCompare(a.at))
  const dupRefs = useMemo(() => {
    const seen = new Map<string, number>()
    state.payments.forEach(p => p.ref && seen.set(p.ref, (seen.get(p.ref) ?? 0) + 1))
    return seen
  }, [state.payments])
  return (
    <Card title={`Payment verification queue (${queue.length})`}>
      {queue.length === 0 ? <Empty>Nothing to verify. 🎉</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Submitted</th><th>Apartment</th><th>Bill</th><th>Method</th><th>Reference</th><th>Slip</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {queue.slice(0, 60).map(p => {
                const bill = state.bills.find(b => b.id === p.billId)
                const dup = (dupRefs.get(p.ref) ?? 0) > 1
                return (
                  <tr key={p.id}>
                    <td>{p.at}</td>
                    <td>{p.aptId}</td>
                    <td>{bill ? monthName(bill.period) : '—'}</td>
                    <td>{p.method}</td>
                    <td>{p.ref}{dup && <div className="badge bad">Duplicate ref</div>}</td>
                    <td className="muted small">📎 {p.slipName}</td>
                    <td className="num">{pkr(p.amount)}</td>
                    <td className="actions">
                      <button className="btn sm" onClick={() => { act(s => confirmPayment(s, p.id)); toast(`Confirmed – ${p.aptId} marked paid`) }}>Confirm</button>
                      <button className="btn sm ghost danger" onClick={() => setReject(p)}>Reject</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {queue.length > 60 && <p className="muted small">Showing first 60 of {queue.length}.</p>}
        </div>
      )}
      {reject && (
        <Modal title={`Reject slip – ${reject.aptId}`} onClose={() => setReject(null)}>
          <Field label="Reason (sent to allottee)"><input value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="row-end">
            <button className="btn ghost" onClick={() => setReject(null)}>Cancel</button>
            <button className="btn danger" onClick={() => {
              act(s => ({
                ...s,
                payments: s.payments.map(p => (p.id === reject.id ? { ...p, status: 'Rejected', reason } : p)),
                bills: s.bills.map(b => (b.id === reject.billId ? { ...b, status: 'Unpaid' } : b)),
              }))
              toast('Slip rejected – allottee notified')
              setReject(null)
            }}>Reject</button>
          </div>
        </Modal>
      )}
    </Card>
  )
}

export function CashDesk() {
  const { state, act, toast } = useStore()
  const [q, setQ] = useState('')
  const [receipt, setReceipt] = useState<string | null>(null)
  const apt = state.apartments.find(a => a.id.toLowerCase() === q.trim().toLowerCase())
  const al = apt && state.allottees.find(a => a.id === apt.allotteeId)
  const unpaid = apt ? state.bills.filter(b => b.aptId === apt.id && b.status === 'Unpaid').sort((a, b) => a.period.localeCompare(b.period)) : []
  const receiptPay = receipt ? state.payments.find(p => p.id === receipt) : undefined
  return (
    <div className="grid2 wide-right">
      <Card title="Record cash payment">
        <Field label="Apartment number"><input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. B-07-302 or E-04-203" /></Field>
        {q && !apt && <p className="muted small">No apartment found. Format: TOWER-FLOORUNIT, e.g. E-12-604.</p>}
        {apt && al && (
          <dl className="kv"><dt>Allottee</dt><dd>{al.name}</dd><dt>CNIC</dt><dd>{al.cnic}</dd><dt>Phone</dt><dd>{al.phone}</dd></dl>
        )}
      </Card>
      <Card title="Unpaid bills">
        {!apt ? <Empty>Search an apartment to see its unpaid bills.</Empty> : unpaid.length === 0 ? <Empty>No unpaid bills for {apt.id}.</Empty> : (
          <table>
            <thead><tr><th>Period</th><th className="num">Total</th><th /></tr></thead>
            <tbody>
              {unpaid.map(b => (
                <tr key={b.id}>
                  <td>{monthName(b.period)}{b.surcharge > 0 && <div className="muted small">incl. surcharge {pkr(b.surcharge)}</div>}</td>
                  <td className="num">{pkr(billTotal(b))}</td>
                  <td className="actions">
                    <button className="btn sm" onClick={() => {
                      const id = uid('PY')
                      act(s => confirmPayment({ ...s, payments: [...s.payments, { id, aptId: b.aptId, billId: b.id, amount: billTotal(b), method: 'Cash', ref: '', status: 'Pending', at: today(), by: 'Association desk' }] }, id))
                      setReceipt(id)
                      toast('Cash recorded – receipt generated')
                    }}>Receive cash</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {receiptPay && <Receipt payment={receiptPay} onClose={() => setReceipt(null)} />}
    </div>
  )
}

export function ComplaintQueue() {
  const { state, act, toast } = useStore()
  const [filter, setFilter] = useState<'Active' | 'All'>('Active')
  const [note, setNote] = useState<Record<string, string>>({})
  const list = state.complaints.filter(c => filter === 'All' || c.status !== 'Resolved').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const assignees = ['Plumbing team', 'Electrical team', ...state.vendors.map(v => v.name)]
  const age = (d: string) => Math.max(0, Math.round((Date.now() - Date.parse(d)) / 864e5))
  return (
    <Card title="Complaint tickets" actions={
      <select value={filter} onChange={e => setFilter(e.target.value as 'Active' | 'All')}><option>Active</option><option>All</option></select>
    }>
      {list.length === 0 ? <Empty>No tickets.</Empty> : (
        <ul className="tickets">
          {list.map(c => (
            <li key={c.id}>
              <div className="ann-h">
                <strong>{c.id} · {c.aptId} · {c.category}</strong>
                <span className="row-gap"><span className={`muted small ${age(c.createdAt) > 3 && c.status !== 'Resolved' ? 'late' : ''}`}>{age(c.createdAt)} days old</span><Badge>{c.status}</Badge></span>
              </div>
              <p>{c.description}</p>
              {c.comments.map((m, i) => <div key={i} className="comment"><strong>{m.by}:</strong> {m.text} <span className="muted small">{m.at}</span></div>)}
              <div className="ticket-actions">
                <select value={c.assignee ?? ''} onChange={e => act(s => ({ ...s, complaints: s.complaints.map(x => x.id === c.id ? { ...x, assignee: e.target.value, status: x.status === 'Open' ? 'In progress' : x.status } : x) }))}>
                  <option value="">Assign to…</option>
                  {assignees.map(a => <option key={a}>{a}</option>)}
                </select>
                <input placeholder="Add a comment for the allottee" value={note[c.id] ?? ''} onChange={e => setNote({ ...note, [c.id]: e.target.value })} />
                <button className="btn sm ghost" disabled={!note[c.id]} onClick={() => { act(s => ({ ...s, complaints: s.complaints.map(x => x.id === c.id ? { ...x, comments: [...x.comments, { by: 'Association', text: note[c.id], at: today() }] } : x) })); setNote({ ...note, [c.id]: '' }) }}>Comment</button>
                {c.status !== 'Resolved' && <button className="btn sm" onClick={() => { act(s => ({ ...s, complaints: s.complaints.map(x => x.id === c.id ? { ...x, status: 'Resolved' } : x) })); toast(`${c.id} resolved`) }}>Mark resolved</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function Vendors() {
  const { state, act, toast } = useStore()
  const [adding, setAdding] = useState(false)
  const [paying, setPaying] = useState<Vendor | null>(null)
  const [v, setV] = useState<Omit<Vendor, 'id'>>({ name: '', service: '', employees: 1, rate: 0, frequency: 'Monthly', start: today(), end: '' })
  const [payRef, setPayRef] = useState('')
  const paidTo = (id: string) => state.expenses.filter(e => e.vendorId === id).reduce((s, e) => s + e.amount, 0)
  return (
    <Card title="Vendor register & agreements" actions={<button className="btn sm" onClick={() => setAdding(true)}>+ Add vendor</button>}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Vendor</th><th>Service</th><th className="num">Staff</th><th className="num">Agreed rate</th><th>Frequency</th><th>Agreement</th><th className="num">Paid to date</th><th /></tr></thead>
          <tbody>
            {state.vendors.map(x => (
              <tr key={x.id}>
                <td><strong>{x.name}</strong></td>
                <td>{x.service}</td>
                <td className="num">{x.employees}</td>
                <td className="num">{pkr(x.rate)}</td>
                <td>{x.frequency}</td>
                <td className="small">{x.start} → {x.end || 'open'}</td>
                <td className="num">{pkr(paidTo(x.id))}</td>
                <td className="actions"><button className="btn sm ghost" onClick={() => { setPaying(x); setPayRef('') }}>Record payment</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <Modal title="Add vendor" onClose={() => setAdding(false)}>
          <Field label="Firm name"><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Nature of service"><input value={v.service} onChange={e => setV({ ...v, service: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="No. of employees"><input type="number" value={v.employees} onChange={e => setV({ ...v, employees: Number(e.target.value) })} /></Field>
            <Field label="Agreed rate (PKR)"><input type="number" value={v.rate} onChange={e => setV({ ...v, rate: Number(e.target.value) })} /></Field>
            <Field label="Payment frequency"><select value={v.frequency} onChange={e => setV({ ...v, frequency: e.target.value as Vendor['frequency'] })}><option>Monthly</option><option>Quarterly</option><option>Per job</option></select></Field>
            <Field label="Agreement file"><input type="file" /></Field>
            <Field label="Start"><input type="date" value={v.start} onChange={e => setV({ ...v, start: e.target.value })} /></Field>
            <Field label="End"><input type="date" value={v.end} onChange={e => setV({ ...v, end: e.target.value })} /></Field>
          </div>
          <div className="row-end"><button className="btn" disabled={!v.name || !v.rate} onClick={() => { act(s => ({ ...s, vendors: [...s.vendors, { ...v, id: uid('V') }] })); setAdding(false); toast('Vendor added') }}>Save vendor</button></div>
        </Modal>
      )}
      {paying && (
        <Modal title={`Pay ${paying.name}`} onClose={() => setPaying(null)}>
          <p>Agreed {paying.frequency.toLowerCase()} rate: <strong>{pkr(paying.rate)}</strong></p>
          <Field label="Cheque / transfer reference"><input value={payRef} onChange={e => setPayRef(e.target.value)} /></Field>
          <div className="row-end"><button className="btn" disabled={!payRef} onClick={() => {
            const ex: Expense = { id: uid('EX'), date: today(), kind: 'Expense', category: 'Vendor payment', amount: paying.rate, description: `${paying.name} – ${paying.service}`, vendorId: paying.id, ref: payRef, by: 'Association treasurer' }
            act(s => ({ ...s, expenses: [...s.expenses, ex] }))
            setPaying(null)
            toast('Vendor payment recorded in the expenditure ledger')
          }}>Record {pkr(paying.rate)}</button></div>
        </Modal>
      )}
    </Card>
  )
}

export function Expenses() {
  const { state, act, toast } = useStore()
  const [e, setE] = useState({ kind: 'Expense' as Expense['kind'], category: 'Petty cash', amount: 0, description: '', ref: '', date: today() })
  const list = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="grid2 wide-right">
      <Card title="New entry">
        <div className="stat inline"><div className="stat-l">Petty cash balance</div><div className="stat-v">{pkr(pettyBalance(state.expenses))}</div></div>
        <Field label="Entry type">
          <select value={e.kind} onChange={x => setE({ ...e, kind: x.target.value as Expense['kind'], category: x.target.value === 'Expense' ? 'Petty cash' : x.target.value === 'Petty cash top-up' ? 'Petty cash' : 'Transfer' })}>
            <option>Expense</option><option>Petty cash top-up</option><option>Transfer to Authority</option>
          </select>
        </Field>
        {e.kind === 'Expense' && (
          <Field label="Category">
            <select value={e.category} onChange={x => setE({ ...e, category: x.target.value })}>
              {['Petty cash', 'Repairs', 'Utilities', 'Supplies', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        )}
        <Field label="Amount (PKR)"><input type="number" value={e.amount || ''} onChange={x => setE({ ...e, amount: Number(x.target.value) })} /></Field>
        <Field label="Description"><input value={e.description} onChange={x => setE({ ...e, description: x.target.value })} /></Field>
        <Field label="Voucher / reference"><input value={e.ref} onChange={x => setE({ ...e, ref: x.target.value })} /></Field>
        <Field label="Receipt (optional)"><input type="file" /></Field>
        <button className="btn" disabled={!e.amount || !e.description} onClick={() => {
          act(s => ({ ...s, expenses: [...s.expenses, { ...e, id: uid('EX'), by: 'Association treasurer' }] }))
          setE({ ...e, amount: 0, description: '', ref: '' })
          toast('Entry posted (append-only)')
        }}>Post entry</button>
      </Card>
      <Card title="Expenditure & petty cash ledger">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Ref</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {list.map(x => (
                <tr key={x.id}>
                  <td>{x.date}</td><td><Badge>{x.kind === 'Expense' ? 'Expense' : x.kind}</Badge></td><td>{x.category}</td><td>{x.description}<div className="muted small">by {x.by}</div></td><td className="mono small">{x.ref}</td><td className="num">{pkr(x.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
