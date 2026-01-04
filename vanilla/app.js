import { StateMachine, createStateButton } from './StateMachine.js'

// ============================================
// Main State Machine Demo
// ============================================

const mainMachine = new StateMachine({
  name: 'demo',
  initial: 'home',
  states: {
    home: {
      onEnter: () => {
        console.log('Entering home state')
        renderState('home', {
          title: 'Home',
          content: 'Welcome to the Ygdrassil Vanilla JS state machine demo! This state can transition to any other state.'
        })
      },
      onExit: () => console.log('Exiting home state')
    },
    about: {
      onEnter: () => {
        console.log('Entering about state')
        renderState('about', {
          title: 'About',
          content: 'Ygdrassil is a lightweight state machine for vanilla JavaScript applications. It uses URL hash changes to manage application state, making your app state bookmarkable and shareable.',
          features: [
            'No dependencies - pure vanilla JavaScript',
            'URL-based state management',
            'Transition controls',
            'Global and state-level lifecycle hooks',
            'Multiple state machines support',
            'Query parameter management'
          ]
        })
      },
      transition: ['home', 'features', 'demo']
    },
    features: {
      onEnter: () => {
        console.log('Entering features state')
        renderState('features', {
          title: 'Features',
          content: 'Ygdrassil provides powerful state management with these key features:',
          list: [
            'State Registration: Dynamically register and unregister states',
            'Lifecycle Hooks: onEnter and onExit callbacks at both state and global level',
            'Transition Control: Define allowed transitions between states',
            'Query Parameters: Manage URL query parameters alongside state',
            'Multiple Machines: Run multiple state machines simultaneously',
            'Event Subscription: Subscribe to state changes for reactive updates'
          ]
        })
      },
      transition: ['about', 'demo']
    },
    demo: {
      onEnter: () => {
        console.log('Entering demo state')
        renderState('demo', {
          title: 'Interactive Demo',
          content: 'Try these interactive features:',
          interactive: true
        })
      },
      transition: ['about', 'features', 'home']
    }
  },
  onEnter: (state) => {
    console.log(`[Global] Entered state: ${state}`)
    updateStateInfo()
  },
  onExit: (state) => {
    console.log(`[Global] Exited state: ${state}`)
  }
})

// Create navigation buttons
const navContainer = document.getElementById('nav-buttons')
const states = ['home', 'about', 'features', 'demo']

states.forEach(state => {
  const button = createStateButton(mainMachine, state, {
    text: state.charAt(0).toUpperCase() + state.slice(1),
    className: 'nav-btn'
  })
  navContainer.appendChild(button)
})

// Render state content
function renderState(stateName, config) {
  const container = document.getElementById('state-content')

  let html = `
    <div class="state-view">
      <h2>${config.title}</h2>
      <p>${config.content}</p>
  `

  if (config.features) {
    html += '<ul>'
    config.features.forEach(feature => {
      html += `<li>${feature}</li>`
    })
    html += '</ul>'
  }

  if (config.list) {
    html += '<ul>'
    config.list.forEach(item => {
      html += `<li>${item}</li>`
    })
    html += '</ul>'
  }

  if (config.interactive) {
    html += `
      <div style="margin-top: 20px;">
        <p><strong>Current query parameters:</strong></p>
        <p>Use the controls below to add query parameters and see them reflected in the URL and state.</p>
      </div>
    `
  }

  html += '</div>'
  container.innerHTML = html
}

// Update state info display
function updateStateInfo() {
  document.getElementById('current-state').textContent = mainMachine.currentState || 'None'
  const transitions = mainMachine.getAvailableTransitions()
  document.getElementById('transitions').textContent = transitions.length > 0 ? transitions.join(', ') : 'Any state'
  updateQueryDisplay()
}

// Query parameter management
document.getElementById('set-param').addEventListener('click', () => {
  const key = document.getElementById('param-key').value.trim()
  const value = document.getElementById('param-value').value.trim()

  if (key) {
    mainMachine.setQuery({ [key]: value || null })
    document.getElementById('param-key').value = ''
    document.getElementById('param-value').value = ''
  }
})

function updateQueryDisplay() {
  const query = mainMachine.getQuery()
  const display = document.getElementById('query-display')

  const items = Object.entries(query)
    .filter(([key]) => !key.startsWith('yg-')) // Hide internal yg- params
    .map(([key, value]) => `<div class="query-item"><strong>${key}:</strong> ${value}</div>`)

  display.innerHTML = items.length > 0
    ? items.join('')
    : '<div class="query-item" style="color: #999;">No custom parameters set</div>'
}

// Subscribe to state changes
mainMachine.subscribe((state) => {
  console.log('State changed:', state)
  updateQueryDisplay()
})

// ============================================
// Multiple State Machines Demo
// ============================================

const machineA = new StateMachine({
  name: 'machine-a',
  initial: 'alpha',
  states: {
    alpha: {
      onEnter: () => {
        document.getElementById('machine-a-content').innerHTML = '<p>Machine A: Alpha State</p>'
      }
    },
    beta: {
      onEnter: () => {
        document.getElementById('machine-a-content').innerHTML = '<p>Machine A: Beta State</p>'
      }
    },
    gamma: {
      onEnter: () => {
        document.getElementById('machine-a-content').innerHTML = '<p>Machine A: Gamma State</p>'
      }
    }
  }
})

const machineB = new StateMachine({
  name: 'machine-b',
  initial: 'one',
  states: {
    one: {
      onEnter: () => {
        document.getElementById('machine-b-content').innerHTML = '<p>Machine B: State One</p>'
      }
    },
    two: {
      onEnter: () => {
        document.getElementById('machine-b-content').innerHTML = '<p>Machine B: State Two</p>'
      }
    },
    three: {
      onEnter: () => {
        document.getElementById('machine-b-content').innerHTML = '<p>Machine B: State Three</p>'
      }
    }
  }
})

// Create navigation for machine A
const machineANav = document.getElementById('machine-a-nav')
;['alpha', 'beta', 'gamma'].forEach(state => {
  const button = createStateButton(machineA, state, {
    text: state.charAt(0).toUpperCase() + state.slice(1)
  })
  machineANav.appendChild(button)
})

// Create navigation for machine B
const machineBNav = document.getElementById('machine-b-nav')
;['one', 'two', 'three'].forEach(state => {
  const button = createStateButton(machineB, state, {
    text: state.charAt(0).toUpperCase() + state.slice(1)
  })
  machineBNav.appendChild(button)
})

// Initialize display
updateStateInfo()

// Log initial states
console.log('Demo initialized')
console.log('Main machine current state:', mainMachine.currentState)
console.log('Machine A current state:', machineA.currentState)
console.log('Machine B current state:', machineB.currentState)
