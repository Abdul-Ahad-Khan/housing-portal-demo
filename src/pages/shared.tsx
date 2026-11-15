import { useState } from 'react'
import type { Bill, PayMethod, Payment, State } from '../data'
import { billTotal, monthName, pkr, today } from '../data'
import { uid, useStore } from '../store'
import { Badge, Card, Empty, Field, Modal } from '../ui'

export const nextReceipt = (s: State) => `RCPT-${1000 + s.payments.filter(p => p.receiptNo).length}`

/** Confirms a payment: marks bill paid, issues receipt number. */
export function confirmPayment(s: State, paymentId: string): State {
  const receiptNo = nextReceipt(s)
  const pay = s.payments.find(p => p.id === paymentId)
  if (!pay) return s
  return {
    ...s,
    payments: s.payments.map(p => (p.id === paymentId ? { ...p, status: 'Confirmed', receiptNo } : p)),
    bills: s.bills.map(b => (b.id === pay.billId ? { ...b, status: 'Paid' } : b)),
  }
}

export function Receipt({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { state } = useStore()
  const apt = state.apartments.find(a => a.id === payment.aptId)
  const al = state.allottees.find(a => a.id === apt?.allotteeId)
  const bill = state.bills.find(b => b.id === payment.billId)
  return (
    <Modal title="Payment receipt" onClose={onClose}>
      <div className="doc-print">
        <div className="doc-head">
          <strong>Housing Authority – Maintenance Receipt</strong>
          <span>{payment.receiptNo}</span>
        </div>
        <dl className="kv">
          <dt>Apartment</dt><dd>{payment.aptId} (Type {apt?.type})</dd>
          <dt>Allottee</dt><dd>{al?.name}</dd>
          <dt>Bill period</dt><dd>{bill ? monthName(bill.period) : '—'}</dd>
          <dt>Amount</dt><dd><strong>{pkr(payment.amount)}</strong></dd>
          <dt>Method</dt><dd>{payment.method}{payment.ref ? ` · ${payment.ref}` : ''}</dd>
          <dt>Date</dt><dd>{payment.at}</dd>
          <dt>Recorded by</dt><dd>{payment.by}</dd>
        </dl>
        <p className="muted small">System-generated receipt. Demo data only.</p>
      </div>
      <div className="row-end">
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div>
    </Modal>
  )
}

/** Bills + pay actions for one apartment. Used by allottee and tenant. */
export function BillsPanel({ aptId, payer }: { aptId: string; payer: string }) {
  const { state, act, toast } = useStore()
  const [paying, setPaying] = useState<{ bill: Bill; mode: 'gateway' | 'slip' } | null>(null)
  const [receipt, setReceipt] = useState<Payment | null>(null)
  const bills = state.bills.filter(b => b.aptId === aptId).sort((a, b) => b.period.localeCompare(a.period))
  const pays = state.payments.filter(p => p.aptId === aptId).sort((a, b) => b.at.localeCompare(a.at))

  return (
    <>
      <Card title="Maintenance bills">
        {bills.length === 0 ? <Empty>No bills yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Period</th><th>Due</th><th className="num">Amount</th><th className="num">Surcharge</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id}>
                    <td>{monthName(b.period)}</td>
                    <td>{b.dueDate}</td>
                    <td className="num">{pkr(b.amount)}</td>
                    <td className="num">{b.surcharge ? pkr(b.surcharge) : '—'}</td>
                    <td className="num"><strong>{pkr(billTotal(b))}</strong></td>
                    <td><Badge>{b.status}</Badge></td>
                    <td className="actions">
                      {b.status === 'Unpaid' && (
                        <>
                          <button className="btn sm" onClick={() => setPaying({ bill: b, mode: 'gateway' })}>Pay online</button>
                          <button className="btn sm ghost" onClick={() => setPaying({ bill: b, mode: 'slip' })}>Upload slip</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Payment history">
        {pays.length === 0 ? <Empty>No payments yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th>Status</th><th /></tr></thead>
              <tbody>
                {pays.map(p => (
                  <tr key={p.id}>
                    <td>{p.at}</td>
                    <td>{p.method}</td>
                    <td>{p.ref || '—'}{p.reason ? <div className="muted small">Reason: {p.reason}</div> : null}</td>
                    <td className="num">{pkr(p.amount)}</td>
                    <td><Badge>{p.status}</Badge></td>
                    <td className="actions">{p.receiptNo && <button className="btn sm ghost" onClick={() => setReceipt(p)}>Receipt</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paying && (
        <PayModal
          bill={paying.bill}
          mode={paying.mode}
          onClose={() => setPaying(null)}
          onPay={(method, ref, slipName) => {
            const id = uid('PY')
            const total = billTotal(paying.bill)
            act(s => {
              const pay: Payment = { id, aptId, billId: paying.bill.id, amount: total, method, ref, slipName, status: 'Pending', at: today(), by: payer }
              let next: State = {
                ...s,
                payments: [...s.payments, pay],
                bills: s.bills.map(b => (b.id === paying.bill.id ? { ...b, status: 'Pending verification' } : b)),
              }
              if (method === 'Payment gateway') next = confirmPayment(next, id)
              return next
            })
            toast(method === 'Payment gateway' ? 'Payment successful – receipt issued' : 'Slip submitted for Association verification')
            setPaying(null)
          }}
        />
      )}
      {receipt && <Receipt payment={receipt} onClose={() => setReceipt(null)} />}
    </>
  )
}

function PayModal({ bill, mode, onClose, onPay }: { bill: Bill; mode: 'gateway' | 'slip'; onClose: () => void; onPay: (m: PayMethod, ref: string, slip?: string) => void }) {
  const [method, setMethod] = useState<PayMethod>('Online transfer')
  const [ref, setRef] = useState('')
  const [file, setFile] = useState('')
  const [card, setCard] = useState('4111 1111 1111 1111')
  const total = billTotal(bill)
  if (mode === 'gateway') {
    return (
      <Modal title="Pay online" onClose={onClose}>
        <p className="muted">Simulated payment gateway (e.g. 1Link / Raast / bank aggregator). No real money moves.</p>
        <div className="pay-amount">{pkr(total)}<span>{monthName(bill.period)}</span></div>
        <Field label="Card or wallet number"><input value={card} onChange={e => setCard(e.target.value)} /></Field>
        <div className="row-end">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => onPay('Payment gateway', `PG${Math.floor(Math.random() * 9e8)}`)}>Pay {pkr(total)}</button>
        </div>
      </Modal>
    )
  }
  return (
    <Modal title="Upload payment slip" onClose={onClose}>
      <div className="pay-amount">{pkr(total)}<span>{monthName(bill.period)}</span></div>
      <Field label="Paid via">
        <select value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
          <option>Online transfer</option>
          <option>Direct deposit</option>
        </select>
      </Field>
      <Field label="Transaction / deposit reference"><input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. IBFT 123456789" /></Field>
      <Field label="Slip image or PDF"><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0]?.name ?? '')} /></Field>
      <div className="row-end">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={!ref || !file} onClick={() => onPay(method, ref, file)}>Submit for verification</button>
      </div>
    </Modal>
  )
}

export function NocCertificate({ nocId, onClose }: { nocId: string; onClose: () => void }) {
  const { state } = useStore()
  const noc = state.nocs.find(n => n.id === nocId)!
  const apt = state.apartments.find(a => a.id === noc.aptId)!
  const al = state.allottees.find(a => a.id === apt.allotteeId)!
  const paid = state.payments.filter(p => p.aptId === apt.id && p.status === 'Confirmed').reduce((s, p) => s + p.amount, 0)
  return (
    <Modal title="No Objection Certificate" onClose={onClose}>
      <div className="doc-print cert">
        <div className="doc-head"><strong>NO OBJECTION CERTIFICATE – ALL DUES CLEAR</strong><span>{noc.certNo}</span></div>
        <p>
          This is to certify that <strong>{al.name}</strong>, CNIC <strong>{al.cnic}</strong>, allottee of apartment{' '}
          <strong>{apt.id}</strong> (Type {apt.type}, {apt.area.toLocaleString()} sq ft covered area, tower {apt.tower}), with possession
          dated <strong>{apt.possession}</strong>, has cleared all maintenance dues up to the date of issue.
        </p>
        <p>Total maintenance payments on record: <strong>{pkr(paid)}</strong>. Outstanding: <strong>PKR 0</strong>.</p>
        <p>The Authority has no objection to the transfer of the above property.</p>
        <div className="sig"><span>Issued: {noc.decidedAt}</span><span>Authorised signatory, Housing Authority</span></div>
      </div>
      <div className="row-end"><button className="btn" onClick={() => window.print()}>Print</button></div>
    </Modal>
  )
}
