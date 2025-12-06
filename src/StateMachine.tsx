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
  /** JSX representing the state's UI (captured from the `<State>` child) */
  element: ReactElement
  onEnter?: () => void
  onExit?: () => void
  transition?: string[]
}

interface StateRegistrationCtx {
  registerState: (name: string, definition: StateDefinition) => void
  unregisterState: (name: string) => void
}

interface Ctx extends StateRegistrationCtx {
  currentState: string | undefined
  gotoState: (
    name: string,
    data?: Record<string, string | number | null | undefined>,
    replace?: boolean,
  ) => void
  close: () => void
  is: (name: string) => boolean
  availableTransitions: string[]
  query: Record<string, string | number>
  setQuery: (
    obj: Record<string, string | number | null | undefined>,
    replace?: boolean,
  ) => void
  /** Hash parameter used by this machine */
  param: string
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
 * Registers itself with the StateMachine and renders only when active.
 */
export const State: React.FC<StateProps> = ({ name, onEnter, onExit, transition, children }) => {
  const { registerState, unregisterState, currentState } = useStateMachine()

  useEffect(() => {
    const definition: StateDefinition = {
      element: children || <></>,
      onEnter,
      onExit,
      transition
    }
    registerState(name, definition)

    return () => {
      unregisterState(name)
    }
  // children is intentionally excluded from the dependency array to avoid
  // infinite re-registration loops since React recreates elements on every
  // render. The definition is updated only when relevant props change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, onEnter, onExit, transition, registerState, unregisterState])
  
  // Only render children when this state is active
  return currentState === name ? <>{children}</> : null
}

interface StateMachineProps {
  initial?: string
  name?: string
  className?: string
  children: ReactNode
}

/**
 * Top-level provider. Manages state registration and transitions.
 */
export const StateMachine: React.FC<StateMachineProps> = ({ initial, children, name, className }) => {
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

  // Force a re-render when states register or unregister so availableTransitions updates
  const [version, setVersion] = useState(0)

  /** Registry of all states */
  const statesRef = useRef<Record<string, StateDefinition>>({})

  const registerState = useCallback((name: string, definition: StateDefinition) => {
    statesRef.current[name] = definition
    setVersion(v => v + 1)
  }, [])

  const unregisterState = useCallback((name: string) => {
    delete statesRef.current[name]
    setVersion(v => v + 1)
  }, [])

  /* ---------- State transition handlers ---------- */
  // Internal state transition (called by hash change handler)
  const transitionToState = useCallback(
    (next: string) => {
      setCurrentState(prev => {
        if (prev === next) return prev // no-op
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
    (
      next: string,
      data?: Record<string, string | number | null | undefined>,
      replace = false,
    ) => {
      const current = currentRef.current
      if (current === next && !data) return // no-op if same state and no data changes

      const allowed = current ? statesRef.current[current]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${current}" to "${next}" not allowed.`)
        return
      }

      // Build new URL params atomically
      const currentHash = window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : ''
      const params = new URLSearchParams(currentHash)

      // Handle data with replace semantics
      if (data) {
        if (replace) {
          // Remove all non-yg- params first
          for (const key of Array.from(params.keys())) {
            if (!key.startsWith('yg-')) params.delete(key)
          }
        }
        for (const [k, v] of Object.entries(data)) {
          if (v == null) params.delete(k)
          else params.set(k, String(v))
        }
      }

      // Set the state param
      params.set(machineStateParam, next)

      const newHash = `#?${params.toString()}`
      window.history.pushState(null, '', newHash)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    },
    [machineStateParam],
  )

  // Close the state machine - removes state param from URL
  const close = useCallback(() => {
    const currentHash = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    const params = new URLSearchParams(currentHash)
    params.delete(machineStateParam)
    
    const newHash = params.toString() ? `#?${params.toString()}` : ''
    window.history.pushState(null, '', newHash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [machineStateParam])

  const setQuery = useCallback(
    (
      obj: Record<string, string | number | null | undefined>,
      replace = false,
    ) => {
      setQueryState(prev => {
        const base = replace
          ? Object.fromEntries(
              Object.entries(prev).filter(([k]) => k.startsWith('yg-')),
            )
          : { ...prev }

        for (const [k, v] of Object.entries(obj)) {
          if (v == null) delete base[k]
          else base[k] = v
        }

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


  /* ---------- Push initial state to the URL on mount ---------- */
  useEffect(() => {
    if (!initial) return
    const existing = readParam()
    if (!existing) {
      const currentHash = window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : ''
      const params = new URLSearchParams(currentHash)
      params.set(machineStateParam, initial)
      const newHash = `#?${params.toString()}`
      window.history.replaceState(null, '', newHash)
    }
  }, [initial, readParam, machineStateParam])


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


  /* ---------- Context value ---------- */
  const ctxValue = useMemo(
    () => {
      void version // include version so memo recomputes when states change
      return {
        currentState,
        gotoState,
        close,
        is: (s: string) => s === currentState,
        availableTransitions: currentState
          ? statesRef.current[currentState]?.transition ?? []
          : [],
        query,
        setQuery,
        registerState,
        unregisterState,
        param: machineStateParam,
      }
    },
    [currentState, gotoState, close, query, setQuery, registerState, unregisterState, machineStateParam, version],
  )


  /* ---------- Render children normally ---------- */
  return (
    <StateMachineContext.Provider value={ctxValue}>
      {currentState
        ? className
          ? <div className={className}>{children}</div>
          : children
        : null}
    </StateMachineContext.Provider>
  )
}


interface StateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  to: string
  data?: Record<string, string | number | null | undefined>
  replace?: boolean
}


export function StateButton({ data, replace, to, children, className, onClick, ...rest }: StateButtonProps) {
  const { gotoState, is } = useStateMachine()

  const classNames = [className, is(to) ? 'active' : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <button {...rest} className={classNames} onClick={e => {
      onClick?.(e)
      gotoState(to, data, replace)
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


export function ExternalButton({ data, machine, to, children, className, onClick, ...rest }: ExternalButtonProps) {
  return <button {...rest} className={className} onClick={e => {
    onClick?.(e)
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

interface StateLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  data?: Record<string, string | number>
  replace?: boolean
  /** Optional target for the underlying anchor. Blank values are ignored */
  target?: string
}

export function StateLink({ data, replace, to, target, children, className, ...rest }: StateLinkProps) {
  const { is, query, param } = useStateMachine()

  const classNames = [className, is(to) ? 'active' : undefined]
    .filter(Boolean)
    .join(' ')

  const href = useMemo(() => {
    const base = replace
      ? Object.fromEntries(
          Object.entries(query).filter(([k]) => k.startsWith('yg-')),
        )
      : { ...query }
    base[param] = to
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v == null) delete base[k]
        else base[k] = v
      }
    }
    const urlParams = Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, String(v)]),
    )
    return `#?${new URLSearchParams(urlParams).toString()}`
  }, [to, data, replace, query, param])

  return (
    <a
      {...rest}
      {...(target ? { target } : {})}
      className={classNames}
      href={href}
    >
      {children ?? to}
    </a>
  )
}

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  machine: string
  data?: Record<string, string | number>
  /** Optional target for the underlying anchor. Blank values are ignored */
  target?: string
}

export function ExternalLink({ data, machine, to, target, children, className, ...rest }: ExternalLinkProps) {
  const href = useMemo(() => {
    const currentHash = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    const params = new URLSearchParams(currentHash)
    params.set(`yg-${machine}`, to)
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v == null) params.delete(k)
        else params.set(k, String(v))
      }
    }
    return `#?${params.toString()}`
  }, [to, data, machine])

  return (
    <a
      {...rest}
      {...(target ? { target } : {})}
      className={className}
      href={href}
    >
      {children ?? to}
    </a>
  )
}
