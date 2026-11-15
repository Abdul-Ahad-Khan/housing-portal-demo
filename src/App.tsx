import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from './data'
import { DEMO_APT, monthName, outstandingFor, pkr } from './data'
import { Skyline } from './viz'
import { useStore } from './store'
import { Card, Icon } from './ui'
import { AllotteeBills, AllotteeComplaints, AllotteeNoc, AllotteeNotices, AllotteeOverview, AllotteeTenants, AnnouncementList } from './pages/Allottee'
import { AssociationOverview, CashDesk, ComplaintQueue, Expenses, Vendors, VerifyQueue } from './pages/Association'
import { AdminUsers, Announcements, Apartments, BillRun, Defaulters, ManagementDashboard, NocApprovals, Reports, SettingsPage } from './pages/Management'
import { BillsPanel } from './pages/shared'

type Nav = { key: string; label: string; icon: string }

const NAV: Record<Role, Nav[]> = {
  allottee: [
    { key: 'home', label: 'Overview', icon: 'home' },
    { key: 'bills', label: 'Bills & payments', icon: 'card' },
    { key: 'complaints', label: 'Complaints', icon: 'wrench' },
    { key: 'tenants', label: 'Tenants', icon: 'users' },
    { key: 'noc', label: 'NOC request', icon: 'doc' },
    { key: 'notices', label: 'Notices', icon: 'bell' },
  ],
  tenant: [{ key: 'bills', label: 'Maintenance bills', icon: 'card' }],
  association: [
    { key: 'home', label: 'Overview', icon: 'home' },
    { key: 'verify', label: 'Verify payments', icon: 'check' },
    { key: 'cash', label: 'Cash desk', icon: 'cash' },
    { key: 'complaints', label: 'Complaints', icon: 'wrench' },
    { key: 'vendors', label: 'Vendors', icon: 'vendor' },
    { key: 'expenses', label: 'Expenses & petty cash', icon: 'receipt' },
  ],
  management: [
    { key: 'home', label: 'Dashboard', icon: 'chart' },
    { key: 'billing', label: 'Bill generation', icon: 'calc' },
    { key: 'defaulters', label: 'Unpaid & notices', icon: 'alert' },
    { key: 'noc', label: 'NOC approvals', icon: 'doc' },
    { key: 'announcements', label: 'Announcements', icon: 'bell' },
    { key: 'reports', label: 'Reports', icon: 'report' },
    { key: 'settings', label: 'Billing rules', icon: 'gear' },
  ],
  admin: [
    { key: 'home', label: 'Users & rights', icon: 'lock' },
    { key: 'apartments', label: 'Apartments', icon: 'building' },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  allottee: 'Allottee', tenant: 'Tenant', association: 'Association', management: 'Management (Authority)', admin: 'System admin',
}

export default function App() {
  const { session, toastMsg } = useStore()
  return (
    <>
      {session ? <Shell /> : <Login />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  )
}

function Login() {
  const { state, setSession, reset, toast } = useStore()
  const [board, setBoard] = useState(false)
  const [armed, setArmed] = useState(false)
  const tenant = state.tenants.find(t => t.active)
  const demo: { role: Role; name: string; desc: string; aptId?: string; user: string }[] = [
    { role: 'allottee', name: 'Ahmed Raza', aptId: DEMO_APT, user: 'allottee.b07302', desc: `Owner of apartment ${DEMO_APT}. Pays bills, raises complaints, registers tenants, requests an NOC.` },
    { role: 'tenant', name: tenant?.name ?? 'Tenant', aptId: tenant?.aptId, user: tenant?.username ?? '—', desc: tenant ? `Renting apartment ${tenant.aptId}. Can only view and pay maintenance bills.` : 'No active tenant. Register one as the allottee first.' },
    { role: 'association', name: 'Shahid Mehmood', user: 'assoc.desk', desc: 'Site office. Verifies payment slips, takes cash, handles complaints, vendors and petty cash.' },
    { role: 'management', name: 'Dr. Saima Noor', user: 'authority.director', desc: 'Housing Authority. Issues bills, tracks collections, approves NOCs, reads the reports.' },
    { role: 'admin', name: 'System Admin', user: 'admin', desc: 'Manages user accounts, roles and apartment records.' },
  ]
  if (board) return <PublicBoard onBack={() => setBoard(false)} />
  const latest = state.bills.reduce((m, b) => (b.period > m ? b.period : m), '')
  const latestBills = state.bills.filter(b => b.period === latest)
  const paidShare = latestBills.length ? latestBills.filter(b => b.status === 'Paid').length / latestBills.length : 0
  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand"><span className="logo">HA</span><div><strong>Housing Management Portal</strong><span>Affordable Housing Project</span></div></div>
        <h1 className="hero-title">Maintenance, payments and resident services for every home in the project.</h1>
        <p className="hero-sub">Bills, payment slips, complaints, tenants and NOCs in one place for the Authority, the Association and {state.apartments.length.toLocaleString()} households across 43 towers.</p>
        <div className="hero-sky">
          <Skyline apartments={state.apartments} bills={state.bills} rows={3} />
          <p className="sky-caption"><i className="dot-on" /> Each window is an apartment. It lights up when its {monthName(latest)} bill is paid: {Math.round(paidShare * 100)}% so far.</p>
        </div>
      </section>
      <section className="login-panel">
        <h2>Sign in to the demo</h2>
        <p className="muted">Choose a role to see the portal from that person's side. All names and figures are fictional.</p>
        <div className="roles">
          {demo.map(d => (
            <button key={d.role} className="role" disabled={d.role === 'tenant' && !tenant} onClick={() => setSession({ role: d.role, name: d.name, aptId: d.aptId })}>
              <span className={`avatar r-${d.role}`}>{d.name.replace('Dr. ', '').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
              <span className="role-body">
                <span className="role-t">{ROLE_LABEL[d.role]}</span>
                <span className="role-n">{d.name}</span>
                <span className="role-d">{d.desc}</span>
              </span>
              <span className="role-go" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        <div className="row-between">
          <button className="btn ghost" onClick={() => setBoard(true)}>Public notice board</button>
          <button className="btn ghost small" onClick={() => {
            if (armed) { reset(); setArmed(false); toast('Demo data reset') }
            else { setArmed(true); toast('Click again to confirm reset'); window.setTimeout(() => setArmed(false), 3000) }
          }}>{armed ? 'Confirm reset' : 'Reset demo data'}</button>
        </div>
        <p className="foot muted small">Prototype for review. The production system is built on ASP.NET Core, Blazor and SQL Server.</p>
      </section>
    </div>
  )
}

function PublicBoard({ onBack }: { onBack: () => void }) {
  return (
    <div className="board-page">
      <div className="login-card wide">
        <div className="row-between"><h2>Public notice board</h2><button className="btn ghost" onClick={onBack}>← Back to sign in</button></div>
        <AnnouncementList publicOnly />
      </div>
    </div>
  )
}

function Shell() {
  const { session, setSession, state } = useStore()
  const s = session!
  const nav = NAV[s.role]
  const [page, setPage] = useState(nav[0].key)
  const [menu, setMenu] = useState(false)
  const go = (p: string) => { setPage(p); setMenu(false) }
  const current = nav.find(n => n.key === page) ?? nav[0]
  const badge = (k: string): number | null => {
    if (s.role === 'association' && k === 'verify') return state.payments.filter(p => p.status === 'Pending').length
    if (s.role === 'association' && k === 'complaints') return state.complaints.filter(c => c.status === 'Open').length
    if (s.role === 'management' && k === 'noc') return state.nocs.filter(n => n.status === 'Requested').length
    return null
  }

  let body: ReactNode = null
  const apt = s.aptId ?? DEMO_APT
  if (s.role === 'allottee') {
    body = page === 'home' ? <AllotteeOverview aptId={apt} go={go} /> : page === 'bills' ? <AllotteeBills aptId={apt} payer="Allottee" /> : page === 'complaints' ? <AllotteeComplaints aptId={apt} /> : page === 'tenants' ? <AllotteeTenants aptId={apt} /> : page === 'noc' ? <AllotteeNoc aptId={apt} /> : <AllotteeNotices aptId={apt} />
  } else if (s.role === 'tenant') {
    body = <><Card><p className="muted">Tenant access is limited to paying maintenance charges for apartment <strong>{apt}</strong>. Outstanding: <strong>{pkr(outstandingFor(state.bills, apt))}</strong></p></Card><BillsPanel aptId={apt} payer="Tenant" /></>
  } else if (s.role === 'association') {
    body = page === 'home' ? <AssociationOverview go={go} /> : page === 'verify' ? <VerifyQueue /> : page === 'cash' ? <CashDesk /> : page === 'complaints' ? <ComplaintQueue /> : page === 'vendors' ? <Vendors /> : <Expenses />
  } else if (s.role === 'management') {
    body = page === 'home' ? <ManagementDashboard /> : page === 'billing' ? <BillRun /> : page === 'defaulters' ? <Defaulters /> : page === 'noc' ? <NocApprovals /> : page === 'announcements' ? <Announcements /> : page === 'reports' ? <Reports /> : <SettingsPage />
  } else {
    body = page === 'home' ? <AdminUsers /> : <Apartments />
  }

  return (
    <div className="shell">
      <aside className={`side ${menu ? 'open' : ''}`}>
        <div className="brand"><span className="logo">HA</span><div><strong>Housing Portal</strong><span>{ROLE_LABEL[s.role]}</span></div></div>
        <nav>
          {nav.map(n => {
            const b = badge(n.key)
            return (
              <button key={n.key} className={`nav ${n.key === current.key ? 'on' : ''}`} onClick={() => go(n.key)}>
                <Icon name={n.icon} />{n.label}{b ? <span className="nav-b">{b}</span> : null}
              </button>
            )
          })}
        </nav>
        <div className="side-foot">
          <div className="me"><strong>{s.name}</strong><span>{s.aptId ? `Apartment ${s.aptId}` : ROLE_LABEL[s.role]}</span></div>
          <button className="btn ghost sm" onClick={() => setSession(null)}>Switch role</button>
        </div>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <main>
        <header className="top">
          <button className="btn ghost burger" onClick={() => setMenu(true)} aria-label="Menu"><Icon name="menu" /></button>
          <div className="top-t">
            <h1>{current.label}</h1>
            <span className="muted small">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <span className="demo-tag">Demo data</span>
        </header>
        <div className="content">{body}</div>
      </main>
    </div>
  )
}
