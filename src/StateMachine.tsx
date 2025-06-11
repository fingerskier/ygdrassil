import React, {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ButtonHTMLAttributes,
} from 'react'

export interface StateDefinition {
  /** JSX representing the state’s UI (captured from the `<State>` child) */
  element: ReactElement
  onEnter?: () => void
  onExit?: () => void
  transition?: string[]
}


interface Ctx {
  currentState: string
  gotoState: (name: string) => void
  is: (name: string) => boolean
  availableTransitions: string[]
  query: URLSearchParams
  setQuery: (obj: Record<string, string>, replace?: boolean) => void
}

export const StateMachineContext = createContext<Ctx | undefined>(undefined)

export const useStateMachine = (): Ctx => {
  const ctx = useContext(StateMachineContext)
  if (!ctx) throw new Error('useStateMachine must be used inside <StateMachine>')
  return ctx
}


export interface StateProps {
  name: string
  onEnter?: () => void
  onExit?: () => void
  transition?: string[]
  children: ReactElement | null
}

/**
 * Declarative state node.
 * Rendered *only* when its parent <StateMachine> marks it active.
 */
export const State: React.FC<StateProps> = ({ children }) => <>{children}</>


interface StateMachineProps {
  initial: string
  name?: string
  children: ReactNode
}


/**
 * Top-level provider.  Renders ONLY the active state’s children.
 */
export const StateMachine: React.FC<StateMachineProps> = ({ initial, children, name }) => {
  const paramName = `yg-${name ?? '#'}`

  const readParam = useCallback(() => {
    const search = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    return new URLSearchParams(search).get(paramName)
  }, [paramName])

  const readQuery = useCallback(
    () =>
      new URLSearchParams(
        window.location.hash.startsWith('#?')
          ? window.location.hash.slice(2)
          : '',
      ),
    [],
  )

  const [currentState, setCurrentState] = useState(() => readParam() ?? initial)
  const [query, setQueryState] = useState<URLSearchParams>(() => readQuery())

  /** Registry of all states declared as children */
  const statesRef = useRef<Record<string, StateDefinition>>({})
  const staticChildren: ReactNode[] = []

  /* ---------- 1. Build/refresh registry from <State> children ---------- */
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child) || child.type !== State) {
      staticChildren.push(child)
      return
    }
    const { name, onEnter, onExit, transition } = child.props as StateProps
    statesRef.current[name] = { element: child, onEnter, onExit, transition }
  })

  /* ---------- 2. State transition handler ---------- */
  const gotoState = useCallback(
    (next: string) =>
      setCurrentState(prev => {
        if (prev === next) return prev; // no-op
        const allowed = statesRef.current[prev]?.transition
        if (allowed && !allowed.includes(next)) {
          console.warn(
            `Transition from "${prev}" to "${next}" not allowed.`,
          )
          return prev
        }
        statesRef.current[prev]?.onExit?.()
        statesRef.current[next]?.onEnter?.()
        return next
      }),
    [],
  )

  const setQuery = useCallback(
    (obj: Record<string, string>, replace = false) => {
      setQueryState(prev => {
        const params = replace
          ? new URLSearchParams()
          : new URLSearchParams(prev.toString())

        if (replace) {
          for (const [k, v] of prev.entries()) if (k.startsWith('yg-')) params.set(k, v)
        }

        for (const [k, v] of Object.entries(obj)) params.set(k, v)
        const str = params.toString()
        window.location.hash = `?${str}`
        return params
      })
    },
    [],
  )

  /* ---------- Sync hash with state ---------- */
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : '',
    )
    params.set(paramName, currentState)
    window.location.hash = `?${params.toString()}`
  }, [currentState, paramName])

  /* ---------- Watch for external hash changes ---------- */
  useEffect(() => {
    const handler = () => {
      const next = readParam()
      if (next && next !== currentState) gotoState(next)
      setQueryState(readQuery())
    }
    handler()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [currentState, gotoState, readParam, readQuery])

  /* ---------- 3. Context value ---------- */
  const ctxValue = useMemo(
    () => ({
      currentState,
      gotoState,
      is: (s: string) => s === currentState,
      availableTransitions: statesRef.current[currentState]?.transition ?? [],
      query,
      setQuery,
    }),
    [currentState, gotoState, query, setQuery],
  )

  /* ---------- 4. Render active state ---------- */
  const active = statesRef.current[currentState]?.element ?? null

  return (
    <StateMachineContext.Provider value={ctxValue}>
      {staticChildren}
      {active}
    </StateMachineContext.Provider>
  )
}


interface StateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  to: string
}

export function StateButton({ to, children, className, ...rest }: StateButtonProps) {
  const { gotoState, is } = useStateMachine()
  const classNames = [className, is(to) ? 'active' : undefined]
    .filter(Boolean)
    .join(' ')
  return (
    <button {...rest} className={classNames} onClick={() => gotoState(to)}>
      {children ?? to}
    </button>
  )
}