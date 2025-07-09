# Ygdrassil

**Ygdrassil** is a very basic state machine implementation for React.
Each state is declared in JSX and only the active state's children are rendered.
The active state and context variables are synced the URL hash/query so app state can be bookmarked.


## Features

- `StateMachine` provider that manages the current state.
  - prop `name` prop for identifying the machine; shows up in the URL as `yg-<name>=yadayada`
  - optional prop `initial` name of the initial state to render
    - w/o `initial` no state is rendered until the user navigates to one
  - optional prop `className` to wrap the children in a `<div>` with those classes
- `State` component for individual states
  - optional prop `onEnter` ~ fx run when entering the state
  - optional prop `onExit` ~ fx run when exiting the state
  - optional prop `transition` prop for listing allowed transitions from the state
    - if no `transition` prop is provided it will transition to any other state
- `useStateMachine` hook for reading or changing the current state.
  - `query` React-state object that mirrors the values in the URL query-string
  - `gotoState` function for changing the current state
  - `currentState` string of the current state's name
  - `close` unloads the current state-machine and URL params
  - `is` function to check if the current state matches a given name
  - `availableTransitions` array of allowed transitions from the current state
  - `setQuery` function for updating the query string & React-state object
    - first argument is an object with key-value pairs to set
    - second argument is a boolean: true means it will replace the entire string with the equivalent of the given object
  - `registerState` function for programmatically registering a state, takes these arguments:
    - `name` ~ name of the state to register
    - `transition` ~ array of allowed transitions from the state
    - `onEnter` ~ function to run when entering the state
    - `onExit` ~ function to run when exiting the state
  - `unregisterState` function for removing a state, takes the `name` of the state to remove
  - `param` string with is used to identify this state-machine in the URL hash
    - if the state-machine is named `demo` the URL will contain `yg-demo=one`
    - the value of that param is the name of the active state
- `StateButton` convenience component for state navigation
  - prop `to` for the name of the state to navigate to
  - prop `className` adds those classes to the button
    - if a StateButton's `to` matches the current state it will have an `active` class
  - children are rendered if given, otherwise the button will render the `to` string in the button
- `StateLink` is just like `StateButton` but renders an `<a>` tag instead of a `<button>`
- `ExternalButton` is like `StateButton` but can be used outside of a `StateMachine` context.
  - you must give it the `machine` prop with the name of the target state-machine
- `ExternalLink` is like `ExternalButton` but renders an `<a>` tag instead of a `<button>`


## Demo / Example / Test

This repository includes a small demo app.
You can view it online here: [https://fingerskier.github.io/ygdrassil/](https://fingerskier.github.io/ygdrassil/)
Or view it offline:

```bash
git clone https://github.com/fingerskier/ygdrassil.git
cd ygdrassil
npm install
npm run dev
```
