import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, State } from './data'
import { seed } from './data'

const KEY = 'housing-portal-demo-v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* storage unavailable or corrupt – fall back to seed */
  }
  return seed()
}

export interface Session {
  role: Role
  aptId?: string // for allottee / tenant
  name: string
}

interface Ctx {
  state: State
  act: (fn: (s: State) => State) => void
  session: Session | null
  setSession: (s: Session | null) => void
  reset: () => void
  toast: (msg: string) => void
  toastMsg: string | null
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [session, setSession] = useState<Session | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore quota errors – demo keeps working in memory */
    }
  }, [state])

  const act = useCallback((fn: (s: State) => State) => setState(s => fn(s)), [])

  const reset = useCallback(() => {
    const fresh = seed()
    setState(fresh)
    setSession(null)
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg(null), 2800)
  }, [])

  return (
    <StoreCtx.Provider value={{ state, act, session, setSession, reset, toast, toastMsg }}>
      {children}
    </StoreCtx.Provider>
  )
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore outside provider')
  return c
}

let counter = 0
/** Unique id without touching state (safe inside event handlers). */
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${(counter++).toString(36).toUpperCase()}`
