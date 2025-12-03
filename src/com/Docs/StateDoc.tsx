export default function StateDoc() {
  return (
    <div className="doc-section">
      <h2>State Component</h2>
      <p>
        Declarative state node component that registers itself with the parent
        StateMachine and renders only when it is the active state.
      </p>

      <h3>Props</h3>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>name</td>
            <td>string</td>
            <td>Yes</td>
            <td>Unique name for this state within the machine</td>
          </tr>
          <tr>
            <td>transition</td>
            <td>string[]</td>
            <td>No</td>
            <td>Array of allowed state names this state can transition to</td>
          </tr>
          <tr>
            <td>onEnter</td>
            <td>() =&gt; void</td>
            <td>No</td>
            <td>Callback fired when entering this state</td>
          </tr>
          <tr>
            <td>onExit</td>
            <td>() =&gt; void</td>
            <td>No</td>
            <td>Callback fired when leaving this state</td>
          </tr>
          <tr>
            <td>children</td>
            <td>ReactNode</td>
            <td>Yes</td>
            <td>Content to render when this state is active</td>
          </tr>
        </tbody>
      </table>

      <h3>Usage</h3>
      <pre>{`<State
  name='processing'
  transition={['success', 'error']}
  onEnter={() => console.log('Started processing')}
  onExit={() => console.log('Finished processing')}
>
  <ProcessingView />
</State>`}</pre>

      <h3>Features</h3>
      <ul>
        <li>Automatically registers on mount and unregisters on unmount</li>
        <li>Only renders children when this is the current state</li>
        <li>Validates transitions if transition prop is provided</li>
        <li>Executes lifecycle hooks at appropriate times</li>
        <li>Works with nested components and hooks</li>
      </ul>
    </div>
  )
}
