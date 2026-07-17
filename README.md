# Ygdrassil

**Ygdrassil** is a lightweight state machine library that syncs state with the URL hash/query for bookmarkable application states.

Available in two flavors:
- **React**: Declarative JSX components with hooks
- **Vanilla JS**: Zero dependencies, works anywhere (includes Web Components)

## TLDR - Quick Links

- 📚 [**Common Features**](#features) - What Ygdrassil does
- ⚛️ [**React Version**](#react-version) - Installation, API, and usage for React
- 🎯 [**Vanilla JS Version**](#vanilla-javascript-version) - Pure JavaScript with no dependencies
- 🚀 [**Demo / Examples**](#demo--example--test) - See it in action


## Features

**Common to both React and Vanilla versions:**

- 🔗 **URL-Based State**: State synced with URL hash for bookmarkable/shareable app states
- 🎯 **Transition Control**: Define allowed transitions between states
- 🪝 **Lifecycle Hooks**: `onEnter` and `onExit` callbacks for state changes
- 🔍 **Query Parameters**: Built-in query parameter management
- 🔄 **Multiple Machines**: Run multiple independent state machines simultaneously
- 📦 **Small & Fast**: Minimal footprint

### URL & transition semantics

- The transition table is authoritative. If the URL is edited (back/forward,
  paste, external link) to a state the current state's `transition` list does
  not allow, the machine stays put and **repairs the URL** back to the current
  state with `history.replaceState` (no new history entry).
- `ExternalButton` / `ExternalLink` write the URL directly and do not consult
  the target machine's transition table — the target machine validates (and
  repairs) on receipt.
- Lifecycle order on every entry, including the initial/deep-linked state:
  state-level `onExit` → state-level `onEnter` → global `onExit` → global `onEnter`.
- Closing a machine (or removing its `yg-` param by hand) runs state-level and
  global `onExit`.
- Query values that look numeric are coerced to numbers (`"5"` → `5`). Beware:
  `"001"` → `1` and very large IDs lose precision — pass such values as
  strings with a non-numeric prefix, or read them from `window.location.hash`
  directly.

---

## React Version

### Installation

```bash
npm install ygdrassil
```

React 18 or 19 is required as a peer dependency.

```jsx
import { StateMachine, State, useStateMachine } from 'ygdrassil'
```

### React Components & API

**`<StateMachine>` Provider**
- `name` - Identifies the machine; appears in URL as `yg-<name>`
- `initial` - Initial state to render (optional)
- `className` - Wraps children in a `<div>` with these classes (optional)
- `onEnter(state)` / `onExit(state)` - Global hooks fired on every state change (optional)
- `onTransitionDenied(from, to)` - Called when a transition is denied by the current state's `transition` list (optional)

**`<State>` Component**
- `onEnter` - Function called when entering the state (optional)
- `onExit` - Function called when exiting the state (optional)
- `transition` - Array of allowed next states (optional, defaults to any state)

**`useStateMachine()` Hook**

Returns an object with:
- `currentState` - String of the current state's name
- `query` - Object mirroring URL query-string values
- `gotoState(name, data?, replace?)` - Navigate to a different state; returns `false` when the transition is denied
- `close()` - Unload the state machine and URL params
- `is(name)` - Check if current state matches given name
- `availableTransitions` - `string[] | null`; `null` = unrestricted (any state), `[]` = terminal (no transitions allowed)
- `setQuery(obj, replace?)` - Update query string
  - `obj` - Key-value pairs to set
  - `replace` - If true, clears all non-`yg-` params first
- `registerState(name, definition)` - Dynamically register a state; `definition` is `{ onEnter?, onExit?, transition? }`
- `unregisterState(name)` - Remove a state
- `param` - URL parameter name (e.g., `yg-demo`)

**Navigation Components**
- `<StateButton to="stateName">` - Button for state navigation
  - Auto-adds `active` class when `to` matches current state
  - Optional `onClick` runs before state change
  - Optional `className`
- `<StateLink to="stateName">` - Same as `StateButton` but renders an `<a>` tag
- `<ExternalButton machine="machineName" to="stateName">` - Navigate from outside a StateMachine context
- `<ExternalLink>` - Same as `ExternalButton` but renders an `<a>` tag

### React Example

```jsx
import { StateMachine, State, StateButton } from 'ygdrassil'

function App() {
  return (
    <StateMachine name="app" initial="home">
      <Navigation />

      <State name="home">
        <h1>Home Page</h1>
      </State>

      <State name="about" onEnter={() => console.log('About loaded')}>
        <h1>About Page</h1>
      </State>
    </StateMachine>
  )
}

function Navigation() {
  return (
    <nav>
      <StateButton to="home">Home</StateButton>
      <StateButton to="about">About</StateButton>
    </nav>
  )
}
```

---

## Vanilla JavaScript Version

The vanilla version provides **zero-dependency** state machine functionality for any web project. No React, no build tools, no frameworks required.

### Installation

**Via npm:**
```bash
npm install ygdrassil
```

**Programmatic API:**
```javascript
import { StateMachine } from 'ygdrassil/vanilla'
```

**Web Components (Custom HTML Elements):**
```javascript
import 'ygdrassil/vanilla/elements'
```

**Or use directly in browser:**
```html
<script type="module">
  import { StateMachine } from './node_modules/ygdrassil/vanilla/StateMachine.js'
  // or for Web Components:
  import './node_modules/ygdrassil/vanilla/StateMachine.elements.js'
</script>
```

### Vanilla Programmatic API

```javascript
import { StateMachine } from 'ygdrassil/vanilla'

const machine = new StateMachine({
  name: 'app',
  initial: 'home',
  onEnter: (state) => console.log(`Entering: ${state}`),  // Global hook
  onExit: (state) => console.log(`Exiting: ${state}`),    // Global hook
  states: {
    home: {
      onEnter: () => {
        document.getElementById('app').innerHTML = '<h1>Home</h1>'
      },
      transition: ['about']  // Can only go to 'about' from here
    },
    about: {
      onEnter: () => {
        document.getElementById('app').innerHTML = '<h1>About</h1>'
      }
    }
  }
})

// Navigate to a state
machine.gotoState('about')

// With query parameters
machine.gotoState('profile', { userId: 123 })

// Subscribe to state changes
const unsubscribe = machine.subscribe(({ currentState, query }) => {
  console.log('State changed:', currentState)
})
```

**Methods:**
- `gotoState(name, data?, replace?)` - Navigate to a state
- `registerState(name, definition)` - Add a state dynamically
- `unregisterState(name)` - Remove a state
- `close()` - Deactivate and clean up
- `is(name)` - Check if current state matches name
- `getAvailableTransitions()` - Get allowed next states
- `getQuery()` - Get query parameters as object
- `setQuery(obj, replace?)` - Update query parameters
- `subscribe(listener)` - Listen for state changes
- `destroy()` - Clean up and remove listeners

**Properties:**
- `currentState` - Current active state name
- `states` - Registry of all states
- `name` - Machine name
- `param` - URL parameter name (`yg-<name>`)

### Vanilla Web Components

Use declarative HTML custom elements:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <state-machine name="app" initial="home">
    <!-- Navigation -->
    <state-nav to="home">Home</state-nav>
    <state-nav to="about">About</state-nav>
    <state-nav to="contact" data-section="general">Contact</state-nav>

    <!-- States -->
    <state-def name="home">
      <h1>Welcome Home!</h1>
      <p>This is the home page.</p>
    </state-def>

    <state-def name="about" transition="home,contact">
      <h1>About Us</h1>
      <p>Can navigate to home or contact from here.</p>
    </state-def>

    <state-def name="contact">
      <h1>Contact</h1>
      <state-query format="list"></state-query>
    </state-def>
  </state-machine>

  <script type="module" src="./node_modules/ygdrassil/vanilla/StateMachine.elements.js"></script>
</body>
</html>
```

**Custom Elements:**
- `<state-machine name="app" initial="home">` - Container for states
- `<state-def name="stateName" transition="state1,state2">` - Define a state
- `<state-nav to="stateName" type="button|link">` - Navigation button/link
- `<state-query format="json|list">` - Display query parameters

**Events:**
- `state-enter` - Fired when entering a state
- `state-exit` - Fired when exiting a state
- `state-change` - Fired on any state change

### Vanilla Features

- ✅ Zero dependencies - pure JavaScript
- ✅ Global `onEnter` and `onExit` hooks (runs for all state changes)
- ✅ State-level lifecycle hooks
- ✅ Transition control
- ✅ Query parameter management
- ✅ Event subscription for reactive updates
- ✅ Web Components for declarative HTML usage
- ✅ Helper functions: `createStateButton()`, `createStateLink()`
- ✅ Works in all modern browsers (ES6+)

**📖 Full Documentation:** See [vanilla/README.md](./vanilla/README.md) for complete API reference and advanced examples.


---

## Demo / Example / Test

### Online Demo

View the live demo: [https://fingerskier.github.io/ygdrassil/](https://fingerskier.github.io/ygdrassil/)

### Run Locally

**React demo:**
```bash
git clone https://github.com/fingerskier/ygdrassil.git
cd ygdrassil
npm install
npm run dev
```

**Vanilla JS demos:**
```bash
cd vanilla
# Open index.html (programmatic API) or elements-demo.html (Web Components) in your browser
# Or serve with:
npx serve .
```

## Contributing

Contributions welcome! Please submit issues and pull requests to the repository.

## License

MIT License - see the main repository for details.
