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
- `StateButton` convenience component for state navigation.
- URL hash integration so state can be persisted across refreshes.

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

Within any state you can call `useStateMachine()` to programmatically navigate or
to check the current state.

```tsx
import { useStateMachine } from 'ygdrassil'

function NextButton() {
  const { gotoState } = useStateMachine()
  return <button onClick={() => gotoState('next')}>Next</button>
}
```

## Development

This repository includes a small demo app. After installing dependencies run:

```bash
npm run dev
```

The application will be served on <http://localhost:5173/> by default.
