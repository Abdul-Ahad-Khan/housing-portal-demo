// Domain types and deterministic mock data for the demo.
// All people, CNICs and amounts are fictional.

export type Role = 'allottee' | 'tenant' | 'association' | 'management' | 'admin'
export type AptType = 'B' | 'E'
export type BillStatus = 'Unpaid' | 'Pending verification' | 'Paid'
export type PayMethod = 'Cash' | 'Online transfer' | 'Direct deposit' | 'Payment gateway'
export type PayStatus = 'Pending' | 'Confirmed' | 'Rejected'

export interface Apartment {
  id: string
  tower: string
  type: AptType
  area: number
  allotteeId: string
  possession: string
}
export interface Allottee {
  id: string
  name: string
  cnic: string
  phone: string
  aptId: string
}
export interface Bill {
  id: string
  aptId: string
  period: string // YYYY-MM
  amount: number
  surcharge: number
  dueDate: string
  status: BillStatus
  issuedOn: string
}
export interface Payment {
  id: string
  aptId: string
  billId: string
  amount: number
  method: PayMethod
  ref: string
  slipName?: string
  status: PayStatus
  reason?: string
  at: string
  by: string
  receiptNo?: string
}
export interface Complaint {
  id: string
  aptId: string
  category: string
  description: string
  status: 'Open' | 'In progress' | 'Resolved'
  assignee?: string
  comments: { by: string; text: string; at: string }[]
  createdAt: string
}
export interface Tenant {
  id: string
  aptId: string
  name: string
  cnic: string
  persons: number
  policeVerified: boolean
  agreement?: string
  active: boolean
  username: string
  createdAt: string
}
export interface Noc {
  id: string
  aptId: string
  requestedAt: string
  reason: string
  status: 'Requested' | 'Approved' | 'Rejected'
  decidedAt?: string
  certNo?: string
}
export interface Vendor {
  id: string
  name: string
  service: string
  employees: number
  rate: number
  frequency: 'Monthly' | 'Quarterly' | 'Per job'
  start: string
  end: string
}
export interface Expense {
  id: string
  date: string
  kind: 'Expense' | 'Petty cash top-up' | 'Transfer to Authority'
  category: string
  amount: number
  description: string
  vendorId?: string
  ref: string
  by: string
}
export interface Announcement {
  id: string
  title: string
  body: string
  date: string
  isPublic: boolean
}
export interface Notice {
  id: string
  aptId: string
  date: string
  text: string
}
export interface User {
  id: string
  name: string
  username: string
  role: Role
  active: boolean
}
export interface Settings {
  rateB: number
  rateE: number
  surchargePct: number
  graceDays: number
}

export interface State {
  apartments: Apartment[]
  allottees: Allottee[]
  bills: Bill[]
  payments: Payment[]
  complaints: Complaint[]
  tenants: Tenant[]
  nocs: Noc[]
  vendors: Vendor[]
  expenses: Expense[]
  announcements: Announcement[]
  notices: Notice[]
  users: User[]
  settings: Settings
  seq: number
}

// ---- deterministic random ----
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const FIRST = ['Ahmed', 'Bilal', 'Usman', 'Hamza', 'Ali', 'Fatima', 'Ayesha', 'Zainab', 'Imran', 'Saad', 'Hina', 'Sana', 'Kashif', 'Nadia', 'Farhan', 'Rabia', 'Tariq', 'Mehwish', 'Junaid', 'Asma']
const LAST = ['Raza', 'Khan', 'Malik', 'Butt', 'Qureshi', 'Siddiqui', 'Chaudhry', 'Sheikh', 'Iqbal', 'Hussain', 'Baig', 'Mirza', 'Awan', 'Javed']

export const DEMO_APT = 'B-07-302'
export const PERIODS = ['2026-08', '2026-09', '2026-10']

export function dueDateFor(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}-10`
}

export function seed(): State {
  const r = rng(20261115)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const cnic = () => `${35000 + Math.floor(r() * 9999)}-${String(Math.floor(r() * 9999999)).padStart(7, '0')}-${Math.floor(r() * 9)}`
  const settings: Settings = { rateB: 3000, rateE: 2000, surchargePct: 10, graceDays: 0 }

  const apartments: Apartment[] = []
  const allottees: Allottee[] = []
  const addTowers = (type: AptType, towers: number, perTower: number, area: number) => {
    for (let t = 1; t <= towers; t++) {
      const tower = `${type}-${String(t).padStart(2, '0')}`
      for (let i = 0; i < perTower; i++) {
        const floor = Math.floor(i / 4) + 1
        const unit = (i % 4) + 1
        const id = `${tower}-${floor}${String(unit).padStart(2, '0')}`
        const alId = `AL-${id}`
        const name = id === DEMO_APT ? 'Ahmed Raza' : `${pick(FIRST)} ${pick(LAST)}`
        apartments.push({ id, tower, type, area, allotteeId: alId, possession: `202${4 + Math.floor(r() * 2)}-0${1 + Math.floor(r() * 9)}-15` })
        allottees.push({ id: alId, name, cnic: id === DEMO_APT ? '35202-1234567-1' : cnic(), phone: `03${Math.floor(r() * 5)}${String(Math.floor(r() * 99999999)).padStart(8, '0')}`, aptId: id })
      }
    }
  }
  addTowers('B', 24, 28, 1496) // 672
  addTowers('E', 19, 48, 912) // 912

  const bills: Bill[] = []
  const payments: Payment[] = []
  let rc = 1000
  const methods: PayMethod[] = ['Cash', 'Online transfer', 'Direct deposit', 'Payment gateway']
  for (const a of apartments) {
    PERIODS.forEach((p, pi) => {
      const amount = a.type === 'B' ? settings.rateB : settings.rateE
      const billId = `BL-${p}-${a.id}`
      const due = dueDateFor(p)
      let status: BillStatus = 'Unpaid'
      const roll = r()
      const paidChance = [0.9, 0.82, 0.55][pi]
      if (a.id === DEMO_APT) status = pi < 2 ? 'Paid' : 'Unpaid'
      else if (roll < paidChance) status = 'Paid'
      else if (pi === 2 && roll < paidChance + 0.08) status = 'Pending verification'
      const surcharge = status === 'Unpaid' && pi < 2 ? Math.round(amount * settings.surchargePct / 100) : 0
      bills.push({ id: billId, aptId: a.id, period: p, amount, surcharge, dueDate: due, status, issuedOn: `${p}-25` })
      if (status !== 'Unpaid') {
        const method = status === 'Pending verification' ? pick(['Online transfer', 'Direct deposit'] as PayMethod[]) : pick(methods)
        // some pay in the billing month (after issue on the 25th), most before the due date
        const early = r() < 0.35
        const d = early ? 26 + Math.floor(r() * 3) : 1 + Math.floor(r() * 10)
        const [y, m] = (early ? `${p}-01` : due).split('-')
        payments.push({
          id: `PY-${billId}`,
          aptId: a.id,
          billId,
          amount,
          method,
          ref: method === 'Cash' ? '' : `TXN${Math.floor(r() * 9e8)}`,
          slipName: method === 'Online transfer' || method === 'Direct deposit' ? `slip_${a.id}.jpg` : undefined,
          status: status === 'Paid' ? 'Confirmed' : 'Pending',
          at: `${y}-${m}-${String(d).padStart(2, '0')}`,
          by: method === 'Cash' ? 'Association desk' : 'Allottee',
          receiptNo: status === 'Paid' ? `RCPT-${rc++}` : undefined,
        })
      }
    })
  }

  const vendors: Vendor[] = [
    { id: 'V1', name: 'CleanCity Services', service: 'Janitorial & waste collection', employees: 18, rate: 450000, frequency: 'Monthly', start: '2026-01-01', end: '2026-12-31' },
    { id: 'V2', name: 'SecureGuard Pvt Ltd', service: 'Security guards', employees: 24, rate: 620000, frequency: 'Monthly', start: '2026-01-01', end: '2027-06-30' },
    { id: 'V3', name: 'LiftCare Engineering', service: 'Elevator maintenance', employees: 6, rate: 380000, frequency: 'Quarterly', start: '2026-03-01', end: '2027-02-28' },
    { id: 'V4', name: 'GreenScape', service: 'Landscaping', employees: 8, rate: 120000, frequency: 'Monthly', start: '2026-04-01', end: '2027-03-31' },
  ]
  const expenses: Expense[] = [
    { id: 'EX1', date: '2026-08-01', kind: 'Petty cash top-up', category: 'Petty cash', amount: 100000, description: 'Imprest top-up for August', ref: 'PC-08', by: 'Association treasurer' },
    { id: 'EX2', date: '2026-08-05', kind: 'Expense', category: 'Vendor payment', amount: 450000, description: 'CleanCity – July invoice', vendorId: 'V1', ref: 'CHQ-5512', by: 'Association treasurer' },
    { id: 'EX3', date: '2026-08-05', kind: 'Expense', category: 'Vendor payment', amount: 620000, description: 'SecureGuard – July invoice', vendorId: 'V2', ref: 'CHQ-5513', by: 'Association treasurer' },
    { id: 'EX4', date: '2026-08-14', kind: 'Expense', category: 'Petty cash', amount: 8500, description: 'Light bulbs, tower B-03 corridors', ref: 'PCV-101', by: 'Site supervisor' },
    { id: 'EX5', date: '2026-09-05', kind: 'Expense', category: 'Vendor payment', amount: 450000, description: 'CleanCity – August invoice', vendorId: 'V1', ref: 'CHQ-5540', by: 'Association treasurer' },
    { id: 'EX6', date: '2026-09-05', kind: 'Expense', category: 'Vendor payment', amount: 620000, description: 'SecureGuard – August invoice', vendorId: 'V2', ref: 'CHQ-5541', by: 'Association treasurer' },
    { id: 'EX7', date: '2026-09-10', kind: 'Expense', category: 'Vendor payment', amount: 380000, description: 'LiftCare – Q3 service', vendorId: 'V3', ref: 'CHQ-5545', by: 'Association treasurer' },
    { id: 'EX8', date: '2026-09-18', kind: 'Expense', category: 'Repairs', amount: 64000, description: 'Water pump motor rewinding, E-11', ref: 'INV-778', by: 'Site supervisor' },
    { id: 'EX9', date: '2026-09-30', kind: 'Transfer to Authority', category: 'Transfer', amount: 1500000, description: 'Surplus maintenance funds – Q3', ref: 'IBFT-90211', by: 'Association treasurer' },
    { id: 'EX10', date: '2026-10-03', kind: 'Expense', category: 'Petty cash', amount: 12300, description: 'Plumbing fittings, B-15', ref: 'PCV-118', by: 'Site supervisor' },
    { id: 'EX11', date: '2026-10-05', kind: 'Expense', category: 'Vendor payment', amount: 450000, description: 'CleanCity – September invoice', vendorId: 'V1', ref: 'CHQ-5571', by: 'Association treasurer' },
    { id: 'EX12', date: '2026-10-05', kind: 'Expense', category: 'Vendor payment', amount: 620000, description: 'SecureGuard – September invoice', vendorId: 'V2', ref: 'CHQ-5572', by: 'Association treasurer' },
    { id: 'EX13', date: '2026-10-08', kind: 'Expense', category: 'Vendor payment', amount: 120000, description: 'GreenScape – September', vendorId: 'V4', ref: 'CHQ-5574', by: 'Association treasurer' },
    { id: 'EX14', date: '2026-10-21', kind: 'Expense', category: 'Utilities', amount: 185000, description: 'Common-area electricity', ref: 'LESCO-10', by: 'Association treasurer' },
  ]

  const complaints: Complaint[] = [
    { id: 'C-101', aptId: DEMO_APT, category: 'Plumbing', description: 'Water leakage from the ceiling of the kitchen.', status: 'In progress', assignee: 'Plumbing team', comments: [{ by: 'Association', text: 'Plumber will visit on Thursday.', at: '2026-11-10' }], createdAt: '2026-11-09' },
    { id: 'C-102', aptId: 'E-04-203', category: 'Elevator', description: 'Lift in tower E-04 stuck on 6th floor twice this week.', status: 'Open', comments: [], createdAt: '2026-11-12' },
    { id: 'C-103', aptId: 'B-11-104', category: 'Security', description: 'Main gate barrier not working at night.', status: 'Open', comments: [], createdAt: '2026-11-13' },
    { id: 'C-104', aptId: 'E-15-502', category: 'Cleanliness', description: 'Garbage not collected from the 5th floor for 3 days.', status: 'Resolved', assignee: 'CleanCity Services', comments: [{ by: 'Association', text: 'Collected and schedule fixed.', at: '2026-11-05' }], createdAt: '2026-11-03' },
  ]

  const tenants: Tenant[] = [
    { id: 'T-1', aptId: 'E-02-401', name: 'Kamran Shah', cnic: '61101-7654321-3', persons: 4, policeVerified: true, agreement: 'rent_agreement_E-02-401.pdf', active: true, username: 'tenant.e02401', createdAt: '2026-07-01' },
  ]

  const announcements: Announcement[] = [
    { id: 'AN1', title: 'Water supply suspension – Sunday', body: 'Water supply to towers B-01 to B-12 will be suspended on Sunday from 9:00 to 14:00 for tank cleaning.', date: '2026-11-12', isPublic: true },
    { id: 'AN2', title: 'October maintenance bills issued', body: 'Bills for October 2026 are now available in your dashboard. Due date: 10 November 2026. A 10% surcharge applies after the due date.', date: '2026-10-25', isPublic: false },
    { id: 'AN3', title: 'Annual general meeting', body: 'The Association AGM will be held on 30 November 2026 at the community hall, 17:00.', date: '2026-11-08', isPublic: true },
  ]

  const users: User[] = [
    { id: 'U1', name: 'Ahmed Raza', username: 'allottee.b07302', role: 'allottee', active: true },
    { id: 'U2', name: 'Kamran Shah', username: 'tenant.e02401', role: 'tenant', active: true },
    { id: 'U3', name: 'Shahid Mehmood', username: 'assoc.desk', role: 'association', active: true },
    { id: 'U4', name: 'Rizwan Akhtar', username: 'assoc.treasurer', role: 'association', active: true },
    { id: 'U5', name: 'Dr. Saima Noor', username: 'authority.director', role: 'management', active: true },
    { id: 'U6', name: 'Faisal Latif', username: 'authority.finance', role: 'management', active: true },
    { id: 'U7', name: 'System Admin', username: 'admin', role: 'admin', active: true },
  ]

  return {
    apartments, allottees, bills, payments, complaints, tenants, nocs: [], vendors, expenses, announcements,
    notices: [], users, settings, seq: 5000,
  }
}

// ---- helpers ----
export const pkr = (n: number) => 'PKR ' + Math.round(n).toLocaleString('en-PK')
export const today = () => new Date().toISOString().slice(0, 10)
export const monthName = (p: string) => {
  const [y, m] = p.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}
export const billTotal = (b: Bill) => b.amount + b.surcharge
export const outstandingFor = (bills: Bill[], aptId: string) =>
  bills.filter(b => b.aptId === aptId && b.status !== 'Paid').reduce((s, b) => s + billTotal(b), 0)
