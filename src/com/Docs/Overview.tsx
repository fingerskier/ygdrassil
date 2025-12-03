export default function Overview() {
  return (
    <div className="doc-section">
      <h2>Ygdrassil - URL-based React State Machine</h2>
      <p>
        Ygdrassil is a minimal, declarative React state machine library that uses
        URL hash parameters for state management. Perfect for creating wizard flows,
        multi-step forms, or any UI requiring explicit state management with shareable URLs.
      </p>

      <h3>Key Features</h3>
      <ul>
        <li><strong>URL Synchronization</strong> - State persists in URL hash for bookmarkability</li>
        <li><strong>Multiple Machines</strong> - Run concurrent state machines via unique names</li>
        <li><strong>Transition Validation</strong> - Optional allowed transitions per state</li>
        <li><strong>Lifecycle Hooks</strong> - onEnter/onExit callbacks</li>
        <li><strong>Query Persistence</strong> - Store/retrieve arbitrary data in URL</li>
        <li><strong>Declarative API</strong> - JSX-based state definition</li>
        <li><strong>Type Safety</strong> - Full TypeScript support</li>
      </ul>

      <h3>Quick Example</h3>
      <pre>{`<StateMachine name='wizard' initial='step1'>
  <State name='step1' transition={['step2']}>
    <Step1 />
  </State>
  <State name='step2' transition={['step1', 'step3']}>
    <Step2 />
  </State>
  <State name='step3' transition={['step2']}>
    <Step3 />
  </State>
</StateMachine>`}</pre>
    </div>
  )
}
