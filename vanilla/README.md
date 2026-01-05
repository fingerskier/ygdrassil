# Ygdrassil Vanilla JS

A lightweight state machine implementation for vanilla JavaScript applications. No dependencies, no frameworks - just pure JavaScript using standard web APIs.

## Features

- **Zero Dependencies**: Pure vanilla JavaScript using only standard web APIs
- **URL-Based State**: State is synced with URL hash for bookmarkable/shareable app states
- **Transition Control**: Define allowed transitions between states
- **Lifecycle Hooks**: Global and state-level `onEnter` and `onExit` callbacks
- **Query Parameters**: Built-in query parameter management
- **Multiple Machines**: Run multiple independent state machines simultaneously
- **Event Subscription**: Subscribe to state changes for reactive updates
- **Small & Fast**: Minimal footprint with no build step required

## Quick Start

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { StateMachine } from './StateMachine.js'

    const machine = new StateMachine({
      name: 'app',
      initial: 'home',
      states: {
        home: {
          onEnter: () => {
            document.getElementById('app').innerHTML = '<h1>Home</h1>'
          }
        },
        about: {
          onEnter: () => {
            document.getElementById('app').innerHTML = '<h1>About</h1>'
          }
        }
      }
    })
  </script>
</body>
</html>
```

### Creating Navigation

```javascript
import { StateMachine, createStateButton } from './StateMachine.js'

const machine = new StateMachine({
  name: 'app',
  initial: 'home',
  states: {
    home: { /* ... */ },
    about: { /* ... */ }
  }
})

// Create navigation buttons
const nav = document.getElementById('navigation')
nav.appendChild(createStateButton(machine, 'home', { text: 'Home' }))
nav.appendChild(createStateButton(machine, 'about', { text: 'About' }))
```

## Web Components (Custom HTML Elements)

For a more declarative approach, use the Web Components version! Define state machines directly in HTML with custom elements.

### Quick Start with Web Components

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

    <!-- States -->
    <state-def name="home">
      <h1>Welcome Home!</h1>
      <p>This is the home page.</p>
    </state-def>

    <state-def name="about">
      <h1>About Us</h1>
      <p>Learn more about our application.</p>
    </state-def>
  </state-machine>

  <script type="module" src="./StateMachine.elements.js"></script>
</body>
</html>
```

### Web Components API

#### `<state-machine>`

Defines a state machine container.

**Attributes:**
- `name` - Machine identifier (default: "default")
- `initial` - Initial state to activate

**Properties:**
- `.machine` - Access the underlying StateMachine instance
- `.currentState` - Get current state name

**Methods:**
- `.gotoState(name, data, replace)` - Navigate to a state
- `.is(name)` - Check if in a state
- `.close()` - Close the machine

**Events:**
- `state-enter` - Fired when entering a state (detail: `{ state }`)
- `state-exit` - Fired when exiting a state (detail: `{ state }`)
- `state-change` - Fired on any state change (detail: `{ currentState, states, query }`)

#### `<state-def>`

Defines a state within a state machine.

**Attributes:**
- `name` - State name (required)
- `transition` - Comma-separated list of allowed next states
- `onenter` - Name of global function to call on enter
- `onexit` - Name of global function to call on exit

**Events:**
- `enter` - Fired when this state is entered
- `exit` - Fired when this state is exited

**Example:**
```html
<state-def name="wizard-step-1" transition="wizard-step-2" onenter="logStep1">
  <h2>Step 1</h2>
  <p>Complete this step to continue.</p>
</state-def>
```

#### `<state-nav>`

Creates a navigation button or link.

**Attributes:**
- `to` - Target state name (required)
- `type` - "button" or "link" (default: "button")
- `machine` - Target machine name (default: finds parent state-machine)
- `data-*` - Query parameters to pass (e.g., `data-user-id="123"`)

**Example:**
```html
<state-nav to="profile" data-user-id="42" data-tab="settings">
  View Profile
</state-nav>
```

#### `<state-query>`

Displays current query parameters.

**Attributes:**
- `format` - "json" or "list" (default: "json")
- `machine` - Target machine name (default: finds parent state-machine)

**Example:**
```html
<state-query format="list"></state-query>
```

### Web Components Examples

**Transition Control:**
```html
<state-machine name="wizard" initial="step1">
  <state-nav to="step1">Step 1</state-nav>
  <state-nav to="step2">Step 2</state-nav>
  <state-nav to="step3">Step 3</state-nav>

  <state-def name="step1" transition="step2">
    <p>You can only go to Step 2 from here</p>
  </state-def>

  <state-def name="step2" transition="step1,step3">
    <p>You can go back to Step 1 or forward to Step 3</p>
  </state-def>

  <state-def name="step3">
    <p>Final step - anywhere to go from here</p>
  </state-def>
</state-machine>
```

**Event Listeners:**
```html
<state-machine id="my-machine" name="app" initial="home">
  <!-- ... states ... -->
</state-machine>

<script type="module">
  import './StateMachine.elements.js'

  const machine = document.getElementById('my-machine')

  machine.addEventListener('state-enter', (e) => {
    console.log('Entered:', e.detail.state)
  })

  machine.addEventListener('state-change', (e) => {
    console.log('State changed:', e.detail)
  })
</script>
```

**Multiple Machines:**
```html
<!-- Navigation Machine -->
<state-machine name="nav" initial="dashboard">
  <state-nav to="dashboard">Dashboard</state-nav>
  <state-nav to="settings">Settings</state-nav>

  <state-def name="dashboard">
    <h1>Dashboard</h1>
  </state-def>

  <state-def name="settings">
    <h1>Settings</h1>
  </state-def>
</state-machine>

<!-- Modal Machine -->
<state-machine name="modal">
  <state-def name="login">
    <div>Login Modal</div>
  </state-def>

  <state-def name="signup">
    <div>Signup Modal</div>
  </state-def>
</state-machine>
```

**See Also:**
- [elements-demo.html](./elements-demo.html) - Interactive Web Components demo
- [index.html](./index.html) - Programmatic API demo
- [test.html](./test.html) - Test suite

## API Reference

### StateMachine

#### Constructor

```javascript
new StateMachine(config)
```

**Config Options:**

- `name` (string, optional): Machine identifier (default: '#'). Appears in URL as `yg-<name>`
- `initial` (string, optional): Initial state to activate on load
- `states` (object, optional): Object mapping state names to definitions
- `onEnter` (function, optional): Global callback fired when entering any state
- `onExit` (function, optional): Global callback fired when exiting any state

**State Definition:**

```javascript
{
  onEnter: () => void,      // Called when entering this state
  onExit: () => void,       // Called when exiting this state
  transition: string[]      // Array of allowed next states
}
```

#### Methods

**`gotoState(stateName, data?, replace?)`**

Navigate to a different state.

- `stateName` (string): Target state name
- `data` (object, optional): Query parameters to set
- `replace` (boolean, optional): If true, replace all non-yg- query params

```javascript
machine.gotoState('about')
machine.gotoState('profile', { userId: 123 })
machine.gotoState('search', { q: 'test' }, true) // replace params
```

**`registerState(name, definition)`**

Register a new state dynamically.

```javascript
machine.registerState('settings', {
  onEnter: () => console.log('Settings opened'),
  onExit: () => console.log('Settings closed'),
  transition: ['home', 'profile']
})
```

**`unregisterState(name)`**

Remove a state from the machine.

```javascript
machine.unregisterState('settings')
```

**`close()`**

Deactivate the state machine and remove its parameter from the URL.

```javascript
machine.close()
```

**`is(stateName)`**

Check if the current state matches a given name.

```javascript
if (machine.is('home')) {
  console.log('Currently on home page')
}
```

**`getAvailableTransitions()`**

Get array of allowed transitions from current state.

```javascript
const allowed = machine.getAvailableTransitions()
// Returns: ['about', 'contact'] or [] if any transition allowed
```

**`getQuery()`**

Get all query parameters from URL as an object.

```javascript
const params = machine.getQuery()
// Returns: { userId: 123, tab: 'profile' }
```

**`setQuery(obj, replace?)`**

Update query parameters in the URL.

- `obj` (object): Key-value pairs to set (null values delete the param)
- `replace` (boolean, optional): If true, replace all non-yg- params

```javascript
machine.setQuery({ userId: 456 })
machine.setQuery({ tab: 'settings' }, false)
machine.setQuery({ tab: null }) // Remove 'tab' parameter
```

**`subscribe(listener)`**

Subscribe to state changes. Returns an unsubscribe function.

```javascript
const unsubscribe = machine.subscribe((state) => {
  console.log('Current state:', state.currentState)
  console.log('Query params:', state.query)
})

// Later: stop listening
unsubscribe()
```

**`destroy()`**

Clean up the machine and remove event listeners.

```javascript
machine.destroy()
```

#### Properties

- `currentState` (string|null): Name of the current active state
- `states` (object): Registry of all registered states
- `name` (string): Machine name
- `param` (string): URL parameter name (`yg-<name>`)

### Helper Functions

#### `createStateButton(machine, targetState, options?)`

Create a navigation button element.

```javascript
const button = createStateButton(machine, 'about', {
  text: 'About Us',
  className: 'nav-button',
  data: { section: 'team' },
  replace: false
})
document.body.appendChild(button)
```

**Options:**
- `text` (string): Button text (defaults to targetState)
- `className` (string): CSS classes to add
- `data` (object): Query parameters to pass on click
- `replace` (boolean): Replace query params on navigation

#### `createStateLink(machine, targetState, options?)`

Create a navigation link (`<a>`) element.

```javascript
const link = createStateLink(machine, 'contact', {
  text: 'Contact Us',
  className: 'nav-link'
})
document.body.appendChild(link)
```

Same options as `createStateButton`.

## Advanced Usage

### Transition Control

Restrict which states can follow the current state:

```javascript
const machine = new StateMachine({
  name: 'wizard',
  initial: 'step1',
  states: {
    step1: {
      transition: ['step2'], // Can only go to step2
      onEnter: () => renderStep1()
    },
    step2: {
      transition: ['step1', 'step3'], // Can go back or forward
      onEnter: () => renderStep2()
    },
    step3: {
      transition: ['step2', 'complete'], // Can go back or complete
      onEnter: () => renderStep3()
    },
    complete: {
      // No transitions defined = terminal state
      onEnter: () => renderComplete()
    }
  }
})
```

### Global Lifecycle Hooks

```javascript
const machine = new StateMachine({
  name: 'app',
  onEnter: (state) => {
    console.log(`Entering: ${state}`)
    // Track analytics
    analytics.track('page_view', { page: state })
  },
  onExit: (state) => {
    console.log(`Exiting: ${state}`)
    // Cleanup
  },
  states: { /* ... */ }
})
```

### Multiple State Machines

Run multiple independent state machines on the same page:

```javascript
const navMachine = new StateMachine({
  name: 'nav',
  initial: 'home',
  states: { home: {}, about: {}, contact: {} }
})

const modalMachine = new StateMachine({
  name: 'modal',
  states: {
    login: { /* ... */ },
    signup: { /* ... */ }
  }
})

// URL will look like: #?yg-nav=home&yg-modal=login
```

### Reactive Updates with Subscriptions

```javascript
const machine = new StateMachine({
  name: 'app',
  states: { /* ... */ }
})

// Update UI when state changes
machine.subscribe(({ currentState, query }) => {
  document.getElementById('current-page').textContent = currentState
  document.getElementById('params').textContent = JSON.stringify(query)
})
```

### Working with Query Parameters

```javascript
// Set multiple parameters
machine.gotoState('search', {
  q: 'javascript',
  category: 'tutorials',
  page: 1
})

// URL becomes: #?yg-app=search&q=javascript&category=tutorials&page=1

// Read parameters
const query = machine.getQuery()
console.log(query.q) // 'javascript'
console.log(query.page) // 1 (auto-converted to number)

// Update parameters without changing state
machine.setQuery({ page: 2 })

// Remove a parameter
machine.setQuery({ category: null })
```

## Examples

### Single Page App

See the included `index.html` for a complete working example with:
- Navigation between states
- Query parameter management
- Multiple simultaneous state machines
- Custom styling and animations

To run the demo:

```bash
# Serve the vanilla directory with any static server
npx serve vanilla
# or
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Simple Router

```javascript
import { StateMachine } from './StateMachine.js'

const router = new StateMachine({
  name: 'router',
  initial: 'home',
  states: {
    home: {
      onEnter: () => {
        document.getElementById('app').innerHTML = `
          <h1>Welcome Home</h1>
          <p>Click a link to navigate</p>
        `
      }
    },
    profile: {
      onEnter: () => {
        const { userId } = router.getQuery()
        document.getElementById('app').innerHTML = `
          <h1>Profile</h1>
          <p>User ID: ${userId || 'Not specified'}</p>
        `
      }
    },
    settings: {
      onEnter: () => {
        document.getElementById('app').innerHTML = `
          <h1>Settings</h1>
          <p>Configure your preferences</p>
        `
      },
      transition: ['home', 'profile'] // Can't go directly to other states
    }
  }
})
```

## Browser Support

Works in all modern browsers that support:
- ES6 Modules
- URLSearchParams
- addEventListener
- History API

Essentially all browsers from 2017 onwards.

## Comparison with React Version

| Feature | Vanilla | React |
|---------|---------|-------|
| Dependencies | None | React required |
| Bundle Size | ~6KB | Depends on React |
| Learning Curve | Minimal JS knowledge | React knowledge required |
| Use Case | Static sites, simple SPAs | React applications |
| JSX Support | No | Yes |
| State Management | Imperative | Declarative |

## License

Same license as the main Ygdrassil project.

## Contributing

Contributions welcome! Please submit issues and pull requests to the main repository.
