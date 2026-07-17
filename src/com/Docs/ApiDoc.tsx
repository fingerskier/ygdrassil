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
  children: ReactElement | null
}`}</pre>

      <h4>StateMachine Props</h4>
      <pre>{`interface StateMachineProps {
  name?: string        // URL param becomes yg-<name>
  initial?: string     // state to adopt when the URL has none
  className?: string   // wrapper div rendered while active
  onEnter?: (state: string) => void
  onExit?: (state: string) => void
  onTransitionDenied?: (from: string | undefined, to: string) => void
  children: ReactNode
}`}</pre>

      <h4>Ctx (Context Interface)</h4>
      <pre>{`interface Ctx {
  currentState: string | undefined
  // returns false when the transition is denied
  gotoState: (
    name: string,
    data?: Record<string, string | number | null | undefined>,
    replace?: boolean,
  ) => boolean
  close: () => void
  is: (name: string) => boolean
  // null = unrestricted, [] = terminal
  availableTransitions: string[] | null
  query: Record<string, string | number>
  setQuery: (
    obj: Record<string, string | number | null | undefined>,
    replace?: boolean,
  ) => void
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

      <h3>URL & transition semantics</h3>
      <ul>
        <li>The transition table is authoritative: a URL edit (back/forward, paste, link)
          to a forbidden state is rejected and the URL is repaired back to the current
          state via history.replaceState — no new history entry</li>
        <li>Lifecycle order on every entry, including initial/deep-linked states:
          state onExit → state onEnter → global onExit → global onEnter</li>
        <li>Closing a machine (or removing its yg- param) runs state and global onExit</li>
        <li>Numeric-looking query values are coerced to numbers ("001" becomes 1) —
          prefix IDs or read window.location.hash directly if that matters</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li>Use unique machine names to avoid conflicts</li>
        <li>Define transition arrays for validation</li>
        <li>Keep state names lowercase and URL-friendly</li>
        <li>Use onEnter/onExit for side effects like analytics or data loading</li>
        <li>Use onTransitionDenied to surface blocked navigation to the user</li>
        <li>Store minimal data in query params (IDs, not full objects)</li>
        <li>Use setQuery for bookmarkable URLs with user data</li>
      </ul>
    </div>
  )
}
