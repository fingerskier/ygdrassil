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

interface PlaceholderProps {
  name: string
  registry: React.MutableRefObject<Record<string, StateDefinition>>
}

/**
 * Placeholder inserted in place of a <State> element so the active state
 * renders at its original location in the tree.
 */
function StatePlaceholder({ name, registry }: PlaceholderProps) {
  const { currentState } = useStateMachine()
  return currentState === name ? registry.current[name]?.element ?? null : null
}

function collectStates(
  nodes: ReactNode,
  registry: React.MutableRefObject<Record<string, StateDefinition>>,
): ReactNode {
  return React.Children.map(nodes, child => {
    if (!React.isValidElement(child)) return child
    const element = child as ReactElement<{ children?: ReactNode }>
    if (element.type === State) {
      const { name, onEnter, onExit, transition } = element.props as StateProps
      registry.current[name] = { element, onEnter, onExit, transition }
      return <StatePlaceholder key={element.key} name={name} registry={registry} />
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
  const machineStateParam = `yg-${name ?? '#'}`

  const readParam = useCallback(() => {
    const search = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    return new URLSearchParams(search).get(machineStateParam)
  }, [machineStateParam])

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
  const currentRef = useRef<string | undefined>(currentState)
  useEffect(() => {
    currentRef.current = currentState
  }, [currentState])
  const [query, setQueryState] = useState<Record<string, string | number>>(() => readQuery())

  /** Registry of all states declared as children */
  const statesRef = useRef<Record<string, StateDefinition>>({})

  /* ---------- 1. Build/refresh registry from <State> children ---------- */
  statesRef.current = {}
  const staticChildren = collectStates(children, statesRef)


  /* ---------- 2. State transition handlers ---------- */
  // Internal state transition (called by hash change handler)
  const transitionToState = useCallback(
    (next: string) => {
      setCurrentState(prev => {
        if (prev === next) return prev; // no-op
        const allowed = prev ? statesRef.current[prev]?.transition : undefined
        if (allowed && !allowed.includes(next)) {
          console.warn(`Transition from "${prev}" to "${next}" not allowed.`)
          return prev
        }
        if (prev) statesRef.current[prev]?.onExit?.()
        statesRef.current[next]?.onEnter?.()
        return next
      })
    },
    [],
  )

  // Public gotoState - updates URL, which triggers state change
  const gotoState = useCallback(
    (next: string) => {
      const current = currentRef.current
      if (current === next) return; // no-op
      
      const allowed = current ? statesRef.current[current]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${current}" to "${next}" not allowed.`)
        return
      }

      // Update URL hash parameter
      const currentHash = window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : ''
      const params = new URLSearchParams(currentHash)
      params.set(machineStateParam, next)
      
      const newHash = `#?${params.toString()}`
      window.history.pushState(null, '', newHash)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    },
    [machineStateParam],
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




  /* ---------- Watch for external hash changes ---------- */
  useEffect(() => {
    const handler = () => {
      const next = readParam()
      if (next) {
        if (next !== currentRef.current) transitionToState(next)
      } else {
        setCurrentState(undefined)
      }
      setQueryState(readQuery())
    }
    handler()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [transitionToState, readParam, readQuery])


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


  /* ---------- 4. Render with placeholders inline ---------- */
  return (
    <StateMachineContext.Provider value={ctxValue}>
      {currentState ? staticChildren : null}
    </StateMachineContext.Provider>
  )
}


interface StateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  to: string
  data?: Record<string, string | number>
  replace?: boolean
}

export function StateButton({ data, replace, to, children, className, ...rest }: StateButtonProps) {
  const { gotoState, is, setQuery } = useStateMachine()

  const classNames = [className, is(to) ? 'active' : undefined]
    .filter(Boolean)
    .join(' ')
  
  return (
    <button {...rest} className={classNames} onClick={() => {
      if (data) setQuery(data, replace)
      gotoState(to)
    }}>
      {children ?? to}
    </button>
  )
}


interface ExternalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  to: string
  machine: string
  data?: Record<string, string | number>
}

export function ExternalButton({ data, machine, to, children, className, ...rest }: ExternalButtonProps) {
  return <button {...rest} className={className} onClick={() => {
    // Parse existing query params
    const currentHash = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    const params = new URLSearchParams(currentHash)
    
    // Add/update the machine parameter
    params.set(`yg-${machine}`, to)

         if (data) {
       for (const [k, v] of Object.entries(data)) params.set(k, String(v))
     }
    
    // Update URL and notify StateMachine
    const newHash = `#?${params.toString()}`
    window.history.pushState(null, '', newHash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }}>{children ?? to}</button>
}