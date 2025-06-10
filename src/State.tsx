import React, { ReactElement } from 'react';

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
