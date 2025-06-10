import React, {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

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
};
