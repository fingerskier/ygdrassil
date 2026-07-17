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
  /** Navigate to a state; returns false when the transition is denied */
  gotoState: (
    name: string,
    data?: Record<string, string | number | null | undefined>,
    replace?: boolean,
  ) => boolean
  close: () => void
  is: (name: string) => boolean
  /** Allowed next states; null = unrestricted (any state), [] = terminal */
  availableTransitions: string[] | null
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
  /** Global callback fired when entering any state */
  onEnter?: (state: string) => void
  /** Global callback fired when exiting any state */
  onExit?: (state: string) => void
  /** Called when a transition is denied by the current state's transition list */
  onTransitionDenied?: (from: string | undefined, to: string) => void
}

/**
 * Top-level provider. Manages state registration and transitions.
 */
export const StateMachine: React.FC<StateMachineProps> = ({ initial, children, name, className, onEnter: globalOnEnter, onExit: globalOnExit, onTransitionDenied }) => {
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

  const initialEnterFiredRef = useRef(false)
  const fireInitialEnter = useCallback((name: string) => {
    if (initialEnterFiredRef.current) return
    initialEnterFiredRef.current = true
    statesRef.current[name]?.onEnter?.()
    globalOnEnter?.(name)
  }, [globalOnEnter])

  const registerState = useCallback((name: string, definition: StateDefinition) => {
    statesRef.current[name] = definition
    setVersion(v => v + 1)
    if (name === currentRef.current) fireInitialEnter(name)
  }, [fireInitialEnter])

  const unregisterState = useCallback((name: string) => {
    delete statesRef.current[name]
    setVersion(v => v + 1)
  }, [])

  /* ---------- State transition handlers ---------- */
  // Validates, runs lifecycle hooks, and commits a transition.
  // Returns false when the current state's transition list denies the move.
  const applyTransition = useCallback(
    (next: string): boolean => {
      const prev = currentRef.current
      if (prev === next) return true // no-op
      const allowed = prev ? statesRef.current[prev]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${prev}" to "${next}" not allowed.`)
        onTransitionDenied?.(prev, next)
        return false
      }
      if (prev) statesRef.current[prev]?.onExit?.()
      statesRef.current[next]?.onEnter?.()
      if (prev) globalOnExit?.(prev)
      globalOnEnter?.(next)
      initialEnterFiredRef.current = true
      currentRef.current = next
      setCurrentState(next)
      return true
    },
    [globalOnEnter, globalOnExit, onTransitionDenied],
  )

  // Public gotoState - updates URL, which triggers state change
  const gotoState = useCallback(
    (
      next: string,
      data?: Record<string, string | number | null | undefined>,
      replace = false,
    ) => {
      const current = currentRef.current
      if (current === next && !data) return true // no-op if same state and no data changes

      const allowed = current ? statesRef.current[current]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${current}" to "${next}" not allowed.`)
        onTransitionDenied?.(current, next)
        return false
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
      return true
    },
    [machineStateParam, onTransitionDenied],
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
      // Read the LIVE hash (not React state) so interleaved writes from other
      // machines are never clobbered.
      const currentHash = window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : ''
      const params = new URLSearchParams(currentHash)

      if (replace) {
        for (const key of Array.from(params.keys())) {
          if (!key.startsWith('yg-')) params.delete(key)
        }
      }

      for (const [k, v] of Object.entries(obj)) {
        if (v == null) params.delete(k)
        else params.set(k, String(v))
      }

      window.history.pushState(null, '', `#?${params.toString()}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
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

  /* ---------- Initial enter (state-level + global), fired exactly once ---------- */
  useEffect(() => {
    // Fallback for an active state that has no <State> child (undeclared name):
    // children's registration effects have already run by the time this fires.
    if (currentState) fireInitialEnter(currentState)
  }, [currentState, fireInitialEnter])


  /* ---------- Watch for external hash changes ---------- */
  useEffect(() => {
    const handler = () => {
      const next = readParam()
      if (next) {
        if (next !== currentRef.current) {
          const accepted = applyTransition(next)
          if (!accepted) {
            // URL claimed a forbidden state: repair our param back to the
            // current state without adding a history entry or re-dispatching
            // (re-dispatch could ping-pong between machines).
            const prev = currentRef.current as string // denial implies a prior state
            const search = window.location.hash.startsWith('#?')
              ? window.location.hash.slice(2)
              : ''
            const params = new URLSearchParams(search)
            params.set(machineStateParam, prev)
            window.history.replaceState(null, '', `#?${params.toString()}`)
          }
        }
      } else if (currentRef.current) {
        // Param removed (close() or URL edit): run exit hooks, then clear.
        const prev = currentRef.current
        statesRef.current[prev]?.onExit?.()
        globalOnExit?.(prev)
        currentRef.current = undefined
        setCurrentState(undefined)
      }
      setQueryState(readQuery())
    }
    handler()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [applyTransition, readParam, readQuery, machineStateParam, globalOnExit])


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
          ? statesRef.current[currentState]?.transition ?? null
          : null,
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
    <button
      {...rest}
      className={classNames}
      aria-current={is(to) ? 'page' : undefined}
      onClick={e => {
        onClick?.(e)
        if (e.defaultPrevented) return
        gotoState(to, data, replace)
      }}
    >
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
    if (e.defaultPrevented) return
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
      aria-current={is(to) ? 'page' : undefined}
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
