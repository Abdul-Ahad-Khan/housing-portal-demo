import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from './data'
import { DEMO_APT, outstandingFor, pkr } from './data'
import { useStore } from './store'
import { Card } from './ui'
import { AllotteeBills, AllotteeComplaints, AllotteeNoc, AllotteeNotices, AllotteeOverview, AllotteeTenants, AnnouncementList } from './pages/Allottee'
import { AssociationOverview, CashDesk, ComplaintQueue, Expenses, Vendors, VerifyQueue } from './pages/Association'
import { AdminUsers, Announcements, Apartments, BillRun, Defaulters, ManagementDashboard, NocApprovals, Reports, SettingsPage } from './pages/Management'
import { BillsPanel } from './pages/shared'

type Nav = { key: string; label: string; icon: string }

const NAV: Record<Role, Nav[]> = {
  allottee: [
    { key: 'home', label: 'Overview', icon: '🏠' },
    { key: 'bills', label: 'Bills & payments', icon: '💳' },
    { key: 'complaints', label: 'Complaints', icon: '🛠️' },
    { key: 'tenants', label: 'Tenants', icon: '👥' },
    { key: 'noc', label: 'NOC request', icon: '📄' },
    { key: 'notices', label: 'Notices', icon: '📢' },
  ],
  tenant: [{ key: 'bills', label: 'Maintenance bills', icon: '💳' }],
  association: [
    { key: 'home', label: 'Overview', icon: '🏠' },
    { key: 'verify', label: 'Verify payments', icon: '✅' },
    { key: 'cash', label: 'Cash desk', icon: '💵' },
    { key: 'complaints', label: 'Complaints', icon: '🛠️' },
    { key: 'vendors', label: 'Vendors', icon: '🤝' },
    { key: 'expenses', label: 'Expenses & petty cash', icon: '🧾' },
  ],
  management: [
    { key: 'home', label: 'Dashboard', icon: '📊' },
    { key: 'billing', label: 'Bill generation', icon: '🧮' },
    { key: 'defaulters', label: 'Unpaid & notices', icon: '⚠️' },
    { key: 'noc', label: 'NOC approvals', icon: '📄' },
    { key: 'announcements', label: 'Announcements', icon: '📢' },
    { key: 'reports', label: 'Reports', icon: '📑' },
    { key: 'settings', label: 'Billing rules', icon: '⚙️' },
  ],
  admin: [
    { key: 'home', label: 'Users & rights', icon: '🔐' },
    { key: 'apartments', label: 'Apartments', icon: '🏢' },
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
    { role: 'allottee', name: 'Ahmed Raza', aptId: DEMO_APT, user: 'allottee.b07302', desc: `Apartment ${DEMO_APT} · bills, payments, complaints, tenants, NOC` },
    { role: 'tenant', name: tenant?.name ?? 'Tenant', aptId: tenant?.aptId, user: tenant?.username ?? '—', desc: tenant ? `Apartment ${tenant.aptId} · can only view and pay maintenance` : 'No active tenant – register one as allottee' },
    { role: 'association', name: 'Shahid Mehmood', user: 'assoc.desk', desc: 'Verify slips, cash receipts, complaints, vendors, petty cash' },
    { role: 'management', name: 'Dr. Saima Noor', user: 'authority.director', desc: 'Dashboards, bill runs, surcharge, notices, NOC approvals, reports' },
    { role: 'admin', name: 'System Admin', user: 'admin', desc: 'User accounts, roles and rights, master data' },
  ]
  if (board) return <PublicBoard onBack={() => setBoard(false)} />
  return (
    <div className="login">
      <div className="login-card">
        <div className="brand big"><span className="logo">HA</span><div><strong>Housing Management Portal</strong><span>Maintenance billing & resident services</span></div></div>
        <p className="muted">Interactive demo with fictional data for {state.apartments.length.toLocaleString()} apartments in 43 towers. Pick a role to sign in.</p>
        <div className="roles">
          {demo.map(d => (
            <button key={d.role} className="role" disabled={d.role === 'tenant' && !tenant} onClick={() => setSession({ role: d.role, name: d.name, aptId: d.aptId })}>
              <span className="role-t">{ROLE_LABEL[d.role]}</span>
              <span className="role-n">{d.name} <span className="mono muted">@{d.user}</span></span>
              <span className="role-d">{d.desc}</span>
            </button>
          ))}
        </div>
        <div className="row-between">
          <button className="btn ghost" onClick={() => setBoard(true)}>📢 Public notice board</button>
          <button className="btn ghost small" onClick={() => {
            if (armed) { reset(); setArmed(false); toast('Demo data reset') }
            else { setArmed(true); toast('Click again to confirm reset'); window.setTimeout(() => setArmed(false), 3000) }
          }}>{armed ? 'Confirm reset' : 'Reset demo data'}</button>
        </div>
      </div>
      <p className="foot muted small">Demo prototype · production build: ASP.NET Core, Blazor, SQL Server</p>
    </div>
  )
}

function PublicBoard({ onBack }: { onBack: () => void }) {
  return (
    <div className="login">
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
                <span>{n.icon}</span>{n.label}{b ? <span className="nav-b">{b}</span> : null}
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
          <button className="btn ghost burger" onClick={() => setMenu(true)} aria-label="Menu">☰</button>
          <h1>{current.label}</h1>
          <span className="demo-tag">DEMO</span>
        </header>
        <div className="content">{body}</div>
      </main>
    </div>
  )
}
