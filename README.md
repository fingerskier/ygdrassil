# Ygdrassil

**Ygdrassil** provides a very small state machine implementation for React.
Each state is declared in JSX and only the active state's children are rendered.
The active state is synced with the browser hash so pages can be bookmarked or
shared with a specific step active.

## Features

- `StateMachine` provider that manages the current state.
- `State` component for declaring individual states with optional `onEnter`,
  `onExit` and `transition` props.
- `useStateMachine` hook for reading or changing the current state.
- `availableTransitions` property on the context for listing allowed
  transitions from the active state.
- `StateButton` convenience component for state navigation (supports linking
  to another machine via the `machine` prop). The `data` prop merges values
  into the query string—pass `null` to remove a parameter.
- `StateLink` and `ExternalLink` components for anchor-based navigation (support a `target` prop).
- `query` and `setQuery` helpers for persisting extra values in the hash.
- URL hash integration so state can be persisted across refreshes.
- Providing an `initial` state automatically updates the URL hash on load.

## Installation

```bash
npm install ygdrassil
```

## Basic usage

```tsx
import { StateMachine, State, StateButton } from 'ygdrassil'

function Example() {
  return (
    <StateMachine initial="one" name="demo">
      <nav>
        <StateButton to="one">One</StateButton>
        <StateButton to="two">Two</StateButton>
        <StateButton to="three">Three</StateButton>
      </nav>

      <State name="one" transition={['two']}>
        <h1>Step One</h1>
      </State>

      <State name="two" transition={['one', 'three']}>
        <h1>Step Two</h1>
      </State>

      <State name="three" transition={['one']}>
        <h1>Step Three</h1>
      </State>
    </StateMachine>
  )
}
```

Use the `machine` prop to link to a state in another machine on the page:

```tsx
<StateButton machine="wizard" to="start">Launch wizard</StateButton>
```

Prefer `<StateLink>`/`<ExternalLink>` when you need a traditional anchor:

```tsx
<StateLink to="two">Go to step two</StateLink>
```
You can pass `target` to either link component; blank values are ignored so `target="_blank"` works as expected.

Within any state you can call `useStateMachine()` to programmatically navigate,
inspect the current state, read query values or check which transitions are
allowed.

```tsx
import { useStateMachine } from 'ygdrassil'

function NextButton() {
  const { gotoState, availableTransitions } = useStateMachine()
  return (
    <button
      disabled={!availableTransitions.includes('next')}
      onClick={() => gotoState('next')}
    >
      Next
    </button>
  )
}
```

## Persisted query values

The hook also exposes a `query` object containing any values stored in the hash
and a `setQuery()` helper for updating them.  These values survive page refreshes
just like the current state.

```tsx
import { useStateMachine } from 'ygdrassil'

function Counter() {
  const { query, setQuery } = useStateMachine()
  const count = Number(query.count) || 0
  return (
    <button onClick={() => setQuery({ count: count + 1 })}>
      Count: {count}
    </button>
  )
}
```

Pass `true` as the second argument to `setQuery` to replace existing values
instead of merging them.

To remove a query parameter pass `null` as its value (using `undefined` also
works). When `replace` is `false` only the provided keys are deleted from the
current query string.

## Development

This repository includes a small demo app. After installing dependencies run:

```bash
npm run dev
```

The application will be served on <http://localhost:5173/> by default.
