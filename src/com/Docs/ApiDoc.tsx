export default function ApiDoc() {
  return (
    <div className="doc-section">
      <h2>API Reference</h2>

      <h3>Exports</h3>
      <pre>{`import {
  StateMachine,
  State,
  StateButton,
  StateLink,
  ExternalButton,
  ExternalLink,
  useStateMachine,
  StateMachineContext
} from 'ygdrassil'`}</pre>

      <h3>TypeScript Interfaces</h3>

      <h4>StateDefinition</h4>
      <pre>{`interface StateDefinition {
  element: ReactNode
  onEnter?: () => void
  onExit?: () => void
  transition?: string[]
}`}</pre>

      <h4>StateProps</h4>
      <pre>{`interface StateProps {
  name: string
  transition?: string[]
  onEnter?: () => void
  onExit?: () => void
  children: ReactNode
}`}</pre>

      <h4>Ctx (Context Interface)</h4>
      <pre>{`interface Ctx {
  currentState: string | undefined
  gotoState: (name: string) => void
  close: () => void
  is: (name: string) => boolean
  availableTransitions: string[]
  query: Record<string, string | number>
  setQuery: (obj: Record<string, any>, replace?: boolean) => void
  registerState: (name: string, definition: StateDefinition) => void
  unregisterState: (name: string) => void
  param: string
}`}</pre>

      <h3>URL Format</h3>
      <p>
        Ygdrassil uses URL hash parameters to store state:
      </p>
      <pre>{`// Single machine
https://example.com/#?yg-app=step1&userId=123

// Multiple machines
https://example.com/#?yg-wizard=step2&yg-settings=profile&data=value`}</pre>

      <h3>Configuration Pattern</h3>
      <p>
        Define state machine configuration for validation:
      </p>
      <pre>{`export const MACHINE_CONFIG = {
  ST: ['state1', 'state2', 'state3'],  // All states
  state1: ['state2'],                   // Allowed transitions
  state2: ['state1', 'state3'],
  state3: ['state1'],
}

// Use in components
<State name='state1' transition={MACHINE_CONFIG.state1}>
  <Component />
</State>`}</pre>

      <h3>Best Practices</h3>
      <ul>
        <li>Use unique machine names to avoid conflicts</li>
        <li>Define transition arrays for validation</li>
        <li>Keep state names lowercase and URL-friendly</li>
        <li>Use onEnter/onExit for side effects like analytics or data loading</li>
        <li>Store minimal data in query params (IDs, not full objects)</li>
        <li>Use setQuery for bookmarkable URLs with user data</li>
      </ul>
    </div>
  )
}
