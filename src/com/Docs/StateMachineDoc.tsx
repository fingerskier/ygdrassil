export default function StateMachineDoc() {
  return (
    <div className="doc-section">
      <h2>StateMachine Component</h2>
      <p>
        The top-level provider component that manages state registration and transitions
        for a state machine instance.
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
            <td>Unique identifier for this state machine</td>
          </tr>
          <tr>
            <td>initial</td>
            <td>string</td>
            <td>Yes</td>
            <td>Initial state name to start with</td>
          </tr>
          <tr>
            <td>className</td>
            <td>string</td>
            <td>No</td>
            <td>CSS class for the container div</td>
          </tr>
          <tr>
            <td>children</td>
            <td>ReactNode</td>
            <td>Yes</td>
            <td>State components and other children</td>
          </tr>
        </tbody>
      </table>

      <h3>Usage</h3>
      <pre>{`<StateMachine name='app' initial='home' className='my-machine'>
  <State name='home' transition={['about']}>
    <Home />
  </State>
  <State name='about' transition={['home']}>
    <About />
  </State>
</StateMachine>`}</pre>

      <h3>Features</h3>
      <ul>
        <li>Automatically registers/unregisters states</li>
        <li>Manages URL hash parameter: <code>#?yg-{'{name}'}={'{state}'}</code></li>
        <li>Supports multiple concurrent machines on the same page</li>
        <li>Validates transitions when specified</li>
        <li>Provides context to all child components via useStateMachine hook</li>
      </ul>
    </div>
  )
}
