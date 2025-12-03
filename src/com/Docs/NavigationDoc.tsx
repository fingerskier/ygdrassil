export default function NavigationDoc() {
  return (
    <div className="doc-section">
      <h2>Navigation Components</h2>
      <p>
        Ygdrassil provides four navigation components for moving between states
        within and across state machines.
      </p>

      <h3>StateButton</h3>
      <p>Button component for navigating to states within the same machine.</p>
      <pre>{`<StateButton to='nextState' className='btn'>
  Go Next
</StateButton>

<StateButton
  to='checkout'
  data={{ userId: 123, cart: items }}
  replace
>
  Checkout
</StateButton>`}</pre>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>to</td>
            <td>string</td>
            <td>Target state name</td>
          </tr>
          <tr>
            <td>data</td>
            <td>object</td>
            <td>Data to store in query params</td>
          </tr>
          <tr>
            <td>replace</td>
            <td>boolean</td>
            <td>Replace current history entry</td>
          </tr>
          <tr>
            <td>onClick</td>
            <td>(e) =&gt; void</td>
            <td>Click handler</td>
          </tr>
        </tbody>
      </table>

      <h3>StateLink</h3>
      <p>Anchor tag version of StateButton.</p>
      <pre>{`<StateLink to='details' target='_blank'>
  View Details
</StateLink>`}</pre>

      <h3>ExternalButton</h3>
      <p>Button for navigating to states in different machines.</p>
      <pre>{`<ExternalButton
  machine='secondMachine'
  to='targetState'
  data={{ referrer: 'firstMachine' }}
>
  Go to Other Machine
</ExternalButton>`}</pre>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>machine</td>
            <td>string</td>
            <td>Target machine name</td>
          </tr>
          <tr>
            <td>to</td>
            <td>string</td>
            <td>Target state name</td>
          </tr>
          <tr>
            <td>data</td>
            <td>object</td>
            <td>Data to store in query params</td>
          </tr>
        </tbody>
      </table>

      <h3>ExternalLink</h3>
      <p>Anchor tag version of ExternalButton.</p>
      <pre>{`<ExternalLink machine='docs' to='api'>
  API Reference
</ExternalLink>`}</pre>
    </div>
  )
}
