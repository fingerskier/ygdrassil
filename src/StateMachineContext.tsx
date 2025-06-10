import React, {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface StateDefinition {
  /** JSX representing the state’s UI (captured from the `<State>` child) */
  element: ReactElement;
  onEnter?: () => void;
  onExit?: () => void;
}

interface Ctx {
  currentState: string;
  gotoState: (name: string) => void;
  is: (name: string) => boolean;
}

export const StateMachineContext = createContext<Ctx | undefined>(undefined);

export const useStateMachine = (): Ctx => {
  const ctx = useContext(StateMachineContext);
  if (!ctx) throw new Error('useStateMachine must be used inside <StateMachine>');
  return ctx;
}


export interface StateProps {
  name: string;
  onEnter?: () => void;
  onExit?: () => void;
  children: ReactElement | null;
}

/**
 * Declarative state node.
 * Rendered *only* when its parent <StateMachine> marks it active.
 */
export const State: React.FC<StateProps> = ({ children }) => <>{children}</>;


interface StateMachineProps {
  initial: string;
  children: ReactNode;
}

/**
 * Top-level provider.  Renders ONLY the active state’s children.
 */
export const StateMachine: React.FC<StateMachineProps> = ({ initial, children }) => {
  const [currentState, setCurrentState] = useState(initial);

  /** Registry of all states declared as children */
  const statesRef = useRef<Record<string, StateDefinition>>({});

  /* ---------- 1. Build/refresh registry from <State> children ---------- */
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;
    const { name, onEnter, onExit } = child.props as StateProps;
    statesRef.current[name] = { element: child, onEnter, onExit };
  });

  /* ---------- 2. State transition handler ---------- */
  const gotoState = useCallback(
    (next: string) =>
      setCurrentState(prev => {
        if (prev === next) return prev; // no-op
        statesRef.current[prev]?.onExit?.();
        statesRef.current[next]?.onEnter?.();
        return next;
      }),
    [],
  );

  /* ---------- 3. Context value ---------- */
  const ctxValue = useMemo(
    () => ({
      currentState,
      gotoState,
      is: (s: string) => s === currentState,
    }),
    [currentState, gotoState],
  );

  /* ---------- 4. Render active state ---------- */
  const active = statesRef.current[currentState]?.element ?? null;

  return (
    <StateMachineContext.Provider value={ctxValue}>
      {active}
    </StateMachineContext.Provider>
  );
};
