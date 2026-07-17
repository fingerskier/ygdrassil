/**
 * Ygdrassil Web Components
 *
 * Custom HTML elements for declarative state machine usage.
 * Wraps the vanilla StateMachine class with Web Components API.
 *
 * @example
 * <state-machine name="app" initial="home">
 *   <state-def name="home">
 *     <h1>Home Page</h1>
 *   </state-def>
 *   <state-def name="about">
 *     <h1>About Page</h1>
 *   </state-def>
 * </state-machine>
 */

import { StateMachine } from './StateMachine.js'

/**
 * <state-machine> custom element
 *
 * Attributes:
 * - name: Machine identifier (default: 'default')
 * - initial: Initial state to activate
 * - no-shadow: If present, don't use shadow DOM
 */
class StateMachineElement extends HTMLElement {
  constructor() {
    super()
    this._machine = null
    this._states = new Map()
    this._initialized = false
  }

  static get observedAttributes() {
    return ['name', 'initial']
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialize()
    }
  }

  disconnectedCallback() {
    if (this._machine) {
      this._machine.destroy()
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this._initialized && oldValue !== newValue) {
      // Reinitialize if key attributes change
      if (name === 'name') {
        this._reinitialize()
      }
    }
  }

  _initialize() {
    const machineName = this.getAttribute('name') || 'default'
    const initial = this.getAttribute('initial')

    // Create the state machine
    this._machine = new StateMachine({
      name: machineName,
      initial: initial,
      onEnter: (state) => {
        this.dispatchEvent(new CustomEvent('state-enter', {
          detail: { state },
          bubbles: true
        }))
        this._updateActiveStates()
      },
      onExit: (state) => {
        this.dispatchEvent(new CustomEvent('state-exit', {
          detail: { state },
          bubbles: true
        }))
      }
    })

    // Expose machine API as element properties
    this.machine = this._machine

    // Subscribe to state changes
    this._machine.subscribe((machineState) => {
      this.dispatchEvent(new CustomEvent('state-change', {
        detail: machineState,
        bubbles: true
      }))
      this._updateActiveStates()
    })

    // Discover and register child state-def elements
    this._discoverStates()

    // Use MutationObserver to watch for new state-def children
    this._observer = new MutationObserver(() => {
      this._discoverStates()
    })
    this._observer.observe(this, { childList: true, subtree: true })

    this._initialized = true
    this._updateActiveStates()
  }

  _reinitialize() {
    if (this._machine) {
      this._machine.destroy()
    }
    if (this._observer) {
      this._observer.disconnect()
    }
    this._initialized = false
    this._states.clear()
    this._initialize()
  }

  _discoverStates() {
    const stateElements = this.querySelectorAll('state-def')

    stateElements.forEach(stateEl => {
      const stateName = stateEl.getAttribute('name')
      if (!stateName) return

      // Register state with machine if not already registered
      if (!this._states.has(stateName)) {
        const transitionStr = stateEl.getAttribute('transition')
        const transition = transitionStr ? transitionStr.split(',').map(s => s.trim()) : undefined

        this._machine.registerState(stateName, {
          onEnter: () => {
            stateEl.dispatchEvent(new CustomEvent('enter', { bubbles: true }))
            // Call custom onenter callback if defined
            const onEnterAttr = stateEl.getAttribute('onenter')
            if (onEnterAttr && window[onEnterAttr]) {
              window[onEnterAttr]()
            }
          },
          onExit: () => {
            stateEl.dispatchEvent(new CustomEvent('exit', { bubbles: true }))
            // Call custom onexit callback if defined
            const onExitAttr = stateEl.getAttribute('onexit')
            if (onExitAttr && window[onExitAttr]) {
              window[onExitAttr]()
            }
          },
          transition
        })

        this._states.set(stateName, stateEl)
      }
    })
  }

  _updateActiveStates() {
    const currentState = this._machine?.currentState

    this._states.forEach((stateEl, stateName) => {
      if (stateName === currentState) {
        stateEl.setAttribute('active', '')
        stateEl.style.display = ''
      } else {
        stateEl.removeAttribute('active')
        stateEl.style.display = 'none'
      }
    })
  }

  /**
   * Public API: Navigate to a state
   */
  gotoState(name, data, replace) {
    this._machine?.gotoState(name, data, replace)
  }

  /**
   * Public API: Check if in a state
   */
  is(name) {
    return this._machine?.is(name) || false
  }

  /**
   * Public API: Get current state
   */
  get currentState() {
    return this._machine?.currentState
  }

  /**
   * Public API: Close the machine
   */
  close() {
    this._machine?.close()
  }
}

/**
 * <state-def> custom element
 *
 * Defines a state within a <state-machine>
 *
 * Attributes:
 * - name: State name (required)
 * - transition: Comma-separated list of allowed next states
 * - onenter: Name of global function to call on enter
 * - onexit: Name of global function to call on exit
 */
class StateDefElement extends HTMLElement {
  constructor() {
    super()
  }

  static get observedAttributes() {
    return ['active']
  }

  connectedCallback() {
    // Initially hide until activated
    if (!this.hasAttribute('active')) {
      this.style.display = 'none'
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active') {
      if (newValue !== null) {
        this.style.display = ''
      } else {
        this.style.display = 'none'
      }
    }
  }
}

/**
 * <state-nav> custom element
 *
 * Creates a navigation button or link for state transitions
 *
 * Attributes:
 * - to: Target state name (required)
 * - machine: Target state machine name (default: finds parent state-machine)
 * - type: 'button' or 'link' (default: 'button')
 * - data-*: Query parameters to pass (e.g., data-user-id="123")
 */
class StateNavElement extends HTMLElement {
  constructor() {
    super()
    this._machine = null
    this._navElement = null
    this._unsubscribe = null
  }

  static get observedAttributes() {
    return ['to', 'type', 'machine']
  }

  connectedCallback() {
    this._initialize()
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe()
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._navElement) {
      this._initialize()
    }
  }

  _initialize() {
    // Find the state machine
    const machineName = this.getAttribute('machine')
    let machineElement

    if (machineName) {
      // Find by name
      machineElement = document.querySelector(`state-machine[name="${machineName}"]`)
    } else {
      // Find parent state-machine
      machineElement = this.closest('state-machine')
    }

    if (!machineElement || !machineElement.machine) {
      console.warn('state-nav: Could not find state-machine')
      return
    }

    this._machine = machineElement.machine

    // Get attributes
    const to = this.getAttribute('to')
    const type = this.getAttribute('type') || 'button'
    const text = this.textContent.trim() || to

    if (!to) {
      console.warn('state-nav: Missing "to" attribute')
      return
    }

    // Collect data-* attributes
    const data = {}
    Array.from(this.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.slice(5) // Remove 'data-' prefix
        data[key] = attr.value
      }
    })

    // Create navigation element
    if (this._navElement) {
      this._navElement.remove()
    }

    if (type === 'link') {
      this._navElement = document.createElement('a')
      this._navElement.href = '#'
      this._updateHref(to, data)
    } else {
      this._navElement = document.createElement('button')
    }

    this._navElement.textContent = text
    this._navElement.className = this.className

    // Update active class
    this._updateActiveClass(to)

    // Subscribe to state changes
    if (this._unsubscribe) {
      this._unsubscribe()
    }
    this._unsubscribe = this._machine.subscribe(() => {
      this._updateActiveClass(to)
      if (type === 'link') {
        this._updateHref(to, data)
      }
    })

    // Add click handler
    this._navElement.addEventListener('click', (e) => {
      e.preventDefault()
      this._machine.gotoState(to, Object.keys(data).length > 0 ? data : null)
    })

    // Clear this element's content and append nav element
    this.innerHTML = ''
    this.appendChild(this._navElement)
  }

  _updateActiveClass(to) {
    if (this._machine.is(to)) {
      this._navElement.classList.add('active')
    } else {
      this._navElement.classList.remove('active')
    }
  }

  _updateHref(to, data) {
    if (this._navElement.tagName === 'A') {
      const query = this._machine.getQuery()
      const params = { ...query, [this._machine.param]: to, ...data }
      const search = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        )
      )
      this._navElement.href = `#?${search.toString()}`
    }
  }
}

/**
 * <state-query> custom element
 *
 * Displays query parameters from the URL
 *
 * Attributes:
 * - machine: Target state machine name (default: finds parent state-machine)
 * - format: 'json' or 'list' (default: 'json')
 */
class StateQueryElement extends HTMLElement {
  constructor() {
    super()
    this._machine = null
    this._unsubscribe = null
  }

  connectedCallback() {
    this._initialize()
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe()
    }
  }

  _initialize() {
    // Find the state machine
    const machineName = this.getAttribute('machine')
    let machineElement

    if (machineName) {
      machineElement = document.querySelector(`state-machine[name="${machineName}"]`)
    } else {
      machineElement = this.closest('state-machine')
    }

    if (!machineElement || !machineElement.machine) {
      console.warn('state-query: Could not find state-machine')
      return
    }

    this._machine = machineElement.machine

    // Subscribe to state changes
    if (this._unsubscribe) {
      this._unsubscribe()
    }
    this._unsubscribe = this._machine.subscribe(() => {
      this._render()
    })

    this._render()
  }

  _render() {
    const format = this.getAttribute('format') || 'json'
    const query = this._machine.getQuery()

    // Filter out yg- parameters
    const entries = Object.entries(query).filter(([key]) => !key.startsWith('yg-'))

    // Build DOM with textContent only — query strings are user-controlled
    // via the URL and must never be interpolated into HTML.
    this.textContent = ''

    if (format === 'json') {
      const pre = document.createElement('pre')
      pre.textContent = JSON.stringify(Object.fromEntries(entries), null, 2)
      this.appendChild(pre)
    } else if (entries.length === 0) {
      const p = document.createElement('p')
      p.textContent = 'No query parameters'
      this.appendChild(p)
    } else {
      const ul = document.createElement('ul')
      for (const [key, value] of entries) {
        const li = document.createElement('li')
        const strong = document.createElement('strong')
        strong.textContent = `${key}:`
        li.appendChild(strong)
        li.appendChild(document.createTextNode(` ${value}`))
        ul.appendChild(li)
      }
      this.appendChild(ul)
    }
  }
}

// Register custom elements
customElements.define('state-machine', StateMachineElement)
customElements.define('state-def', StateDefElement)
customElements.define('state-nav', StateNavElement)
customElements.define('state-query', StateQueryElement)

export {
  StateMachineElement,
  StateDefElement,
  StateNavElement,
  StateQueryElement
}
