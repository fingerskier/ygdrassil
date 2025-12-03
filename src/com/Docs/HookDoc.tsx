export default function HookDoc() {
  return (
    <div className="doc-section">
      <h2>useStateMachine Hook</h2>
      <p>
        The main hook for accessing state machine context and methods. Must be used
        within a StateMachine provider.
      </p>

      <h3>Return Value</h3>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>currentState</td>
            <td>string | undefined</td>
            <td>Name of the currently active state</td>
          </tr>
          <tr>
            <td>gotoState</td>
            <td>(name: string) =&gt; void</td>
            <td>Navigate to a specific state</td>
          </tr>
          <tr>
            <td>close</td>
            <td>() =&gt; void</td>
            <td>Close/unload the state machine</td>
          </tr>
          <tr>
            <td>is</td>
            <td>(name: string) =&gt; boolean</td>
            <td>Check if given state is the current state</td>
          </tr>
          <tr>
            <td>availableTransitions</td>
            <td>string[]</td>
            <td>Array of allowed next states from current state</td>
          </tr>
          <tr>
            <td>query</td>
            <td>Record&lt;string, string | number&gt;</td>
            <td>Current query parameters as object</td>
          </tr>
          <tr>
            <td>setQuery</td>
            <td>(obj, replace?) =&gt; void</td>
            <td>Update query parameters</td>
          </tr>
          <tr>
            <td>param</td>
            <td>string</td>
            <td>Hash parameter name (e.g., "yg-app")</td>
          </tr>
        </tbody>
      </table>

      <h3>Usage</h3>
      <pre>{`function MyComponent() {
  const {
    currentState,
    gotoState,
    is,
    availableTransitions,
    query,
    setQuery
  } = useStateMachine()

  const handleNext = () => {
    if (availableTransitions.includes('nextStep')) {
      setQuery({ timestamp: Date.now() })
      gotoState('nextStep')
    }
  }

  return (
    <div>
      <p>Current: {currentState}</p>
      {is('processing') && <Spinner />}
      <button onClick={handleNext}>Next</button>
    </div>
  )
}`}</pre>

      <h3>Query Parameter Management</h3>
      <p>
        The query object and setQuery function allow you to persist arbitrary data
        in the URL hash parameters:
      </p>
      <pre>{`// Set query data
setQuery({ userId: 123, step: 'checkout' })
// URL becomes: #?yg-app=currentState&userId=123&step=checkout

// Read query data
const userId = query.userId // 123
const step = query.step     // 'checkout'

// Replace instead of merge
setQuery({ newData: 'value' }, true)`}</pre>
    </div>
  )
}
