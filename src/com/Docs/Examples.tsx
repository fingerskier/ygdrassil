export default function Examples() {
  return (
    <div className="doc-section">
      <h2>Examples</h2>
      <p>
        This demo application showcases multiple state machines running concurrently,
        demonstrating the key features of Ygdrassil.
      </p>

      <h3>First Machine (Basic Flow)</h3>
      <p>
        A simple 3-state machine demonstrating basic navigation and query parameter persistence:
      </p>
      <ul>
        <li><strong>One</strong> - Shows query param persistence with countdown</li>
        <li><strong>Two</strong> - Non-persistent state with navigation controls</li>
        <li><strong>Three</strong> - Non-persistent state demonstrating return to One</li>
      </ul>

      <h3>Second Machine (Advanced Features)</h3>
      <p>
        A 4-state machine showing lifecycle hooks and different data types:
      </p>
      <ul>
        <li><strong>Alpha</strong> - Numeric query parameter persistence</li>
        <li><strong>Beta</strong> - String query parameter persistence</li>
        <li><strong>Gamma</strong> - Demonstrates onEnter/onExit lifecycle hooks</li>
        <li><strong>Delta</strong> - Shows restart functionality and available transitions</li>
      </ul>

      <h3>Real-World Use Cases</h3>
      <ul>
        <li><strong>Multi-step Forms</strong> - Wizard flows with validation at each step</li>
        <li><strong>Onboarding Flows</strong> - Guide users through setup process</li>
        <li><strong>Shopping Carts</strong> - Browse → Cart → Checkout → Payment → Confirmation</li>
        <li><strong>Survey/Quiz Apps</strong> - Question by question with state persistence</li>
        <li><strong>Dashboard Views</strong> - Switch between different data views with URL sync</li>
      </ul>

      <h3>Key Patterns</h3>
      <pre>{`// Pattern 1: Validation before transition
const { gotoState, setQuery, query } = useStateMachine()

const handleSubmit = () => {
  if (isValid(formData)) {
    setQuery({ formData })
    gotoState('nextStep')
  }
}

// Pattern 2: Conditional rendering based on state
const { is } = useStateMachine()

return (
  <div>
    {is('loading') && <Spinner />}
    {is('error') && <ErrorMessage />}
    {is('success') && <SuccessView />}
  </div>
)

// Pattern 3: Available transitions for dynamic UI
const { availableTransitions } = useStateMachine()

return (
  <div>
    {availableTransitions.map(state => (
      <StateButton key={state} to={state}>
        Go to {state}
      </StateButton>
    ))}
  </div>
)`}</pre>
    </div>
  )
}
