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
  currentState: string | undefined
  gotoState: (name: string) => void
  is: (name: string) => boolean
  availableTransitions: string[]
  query: Record<string, string | number>
  setQuery: (obj: Record<string, string | number>, replace?: boolean) => void
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

function collectStates(
  nodes: ReactNode,
  registry: Record<string, StateDefinition>,
): ReactNode {
  return React.Children.map(nodes, child => {
    if (!React.isValidElement(child)) return child
    const element = child as ReactElement<{ children?: ReactNode }>
    if (element.type === State) {
      const { name, onEnter, onExit, transition } = element.props as StateProps
      registry[name] = { element, onEnter, onExit, transition }
      return null
    }
    if (element.props.children) {
      const processed = collectStates(element.props.children, registry)
      if (processed !== element.props.children) {
        return React.cloneElement(element, {
          ...element.props,
          children: processed,
        })
      }
    }
    return element
  })
}


interface StateMachineProps {
  initial?: string
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

  const readQuery = useCallback(() => {
    const params = new URLSearchParams(
      window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : '',
    )
    const entries = Array.from(params.entries()).map(([k, v]) => {
      // Try to parse as number if it looks like one
      const num = Number(v)
      return [k, !isNaN(num) && v !== '' ? num : v]
    })
    return Object.fromEntries(entries) as Record<string, string | number>
  }, [])

  const [currentState, setCurrentState] = useState<string | undefined>(
    () => readParam() ?? initial,
  )
  const [query, setQueryState] = useState<Record<string, string | number>>(() => readQuery())

  /** Registry of all states declared as children */
  const statesRef = useRef<Record<string, StateDefinition>>({})

  /* ---------- 1. Build/refresh registry from <State> children ---------- */
  statesRef.current = {}
  const staticChildren = collectStates(children, statesRef.current)


  /* ---------- 2. State transition handler ---------- */
  const gotoState = useCallback(
    (next: string) =>
      setCurrentState(prev => {
        if (prev === next) return prev; // no-op
        const allowed = prev ? statesRef.current[prev]?.transition : undefined
        if (allowed && !allowed.includes(next)) {
          console.warn(
            `Transition from "${prev}" to "${next}" not allowed.`,
          )
          return prev
        }
        if (prev) statesRef.current[prev]?.onExit?.()
        statesRef.current[next]?.onEnter?.()
        return next
      }),
    [],
  )

  
  const setQuery = useCallback(
    (obj: Record<string, string | number>, replace = false) => {
      setQueryState(prev => {
        const base = replace
          ? Object.fromEntries(
              Object.entries(prev).filter(([k]) => k.startsWith('yg-')),
            )
          : { ...prev }

        for (const [k, v] of Object.entries(obj)) base[k] = v
        
        // Convert to strings for URL
        const urlParams = Object.fromEntries(
          Object.entries(base).map(([k, v]) => [k, String(v)])
        )
        const str = new URLSearchParams(urlParams).toString()
        window.location.hash = `?${str}`
        return base
      })
    },
    [],
  )

  
  /* ---------- Sync hash with state ---------- */
  useEffect(() => {
    if (!initial) return
    const params = new URLSearchParams(
      window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : '',
    )
    if (currentState) {
      params.set(paramName, currentState)
    } else {
      params.delete(paramName)
    }
    window.location.hash = `?${params.toString()}`
  }, [currentState, paramName, initial])


  /* ---------- Watch for external hash changes ---------- */
  useEffect(() => {
    const handler = () => {
      const next = readParam()
      if (next) {
        if (next !== currentState) gotoState(next)
      } else {
        setCurrentState(undefined)
      }
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
      availableTransitions: currentState
        ? statesRef.current[currentState]?.transition ?? []
        : [],
      query,
      setQuery,
    }),
    [currentState, gotoState, query, setQuery],
  )


  /* ---------- 4. Render active state ---------- */
  const active =
    currentState && statesRef.current[currentState]?.element
      ? statesRef.current[currentState]?.element
      : null

  return (
    <StateMachineContext.Provider value={ctxValue}>
      {currentState ? (
        <>
          {staticChildren}
          {active}
        </>
      ) : null}
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