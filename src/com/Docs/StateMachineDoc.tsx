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
            <td>No</td>
            <td>Machine identifier; the URL param becomes yg-&lt;name&gt;</td>
          </tr>
          <tr>
            <td>initial</td>
            <td>string</td>
            <td>No</td>
            <td>State to adopt when the URL has none for this machine</td>
          </tr>
          <tr>
            <td>className</td>
            <td>string</td>
            <td>No</td>
            <td>Wraps children in a div with these classes while the machine is active</td>
          </tr>
          <tr>
            <td>onEnter / onExit</td>
            <td>(state) =&gt; void</td>
            <td>No</td>
            <td>Global hooks fired after the state-level hooks on every change</td>
          </tr>
          <tr>
            <td>onTransitionDenied</td>
            <td>(from, to) =&gt; void</td>
            <td>No</td>
            <td>Called when a transition is denied by the current state's transition list</td>
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
        <li>Validates transitions when specified — a rejected URL-driven navigation
          repairs the URL back to the current state</li>
        <li>Provides context to all child components via useStateMachine hook</li>
        <li>Renders nothing (children unmounted) while the machine has no active state</li>
      </ul>
    </div>
  )
}
