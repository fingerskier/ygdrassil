import { describe, it, expect, afterEach } from 'vitest'
import '../../vanilla/StateMachine.elements.js'

// Custom elements upgrade synchronously in jsdom when innerHTML parses,
// but give microtasks a chance for observer callbacks.
const flushUpgrade = () => Promise.resolve()

afterEach(() => {
  document.body.innerHTML = ''
  window.location.hash = ''
})

describe('<state-def> reconciliation', () => {
  const mount = async (inner) => {
    document.body.innerHTML = `<state-machine name="app" initial="home">${inner}</state-machine>`
    await flushUpgrade()
    return document.querySelector('state-machine')
  }

  it('registers a state-def added after initialization', async () => {
    const el = await mount('<state-def name="home"></state-def>')
    const def = document.createElement('state-def')
    def.setAttribute('name', 'late')
    el.appendChild(def)
    await flushUpgrade()
    expect(el.machine.states.late).toBeDefined()
  })

  it('unregisters a removed state-def', async () => {
    const el = await mount('<state-def name="home"></state-def><state-def name="gone"></state-def>')
    expect(el.machine.states.gone).toBeDefined()
    el.querySelector('state-def[name="gone"]').remove()
    await flushUpgrade()
    expect(el.machine.states.gone).toBeUndefined()
  })

  it('applies a changed transition attribute', async () => {
    const el = await mount('<state-def name="home" transition="a"></state-def><state-def name="a"></state-def><state-def name="b"></state-def>')
    expect(el.machine.states.home.transition).toEqual(['a'])
    el.querySelector('state-def[name="home"]').setAttribute('transition', 'a,b')
    await flushUpgrade()
    expect(el.machine.states.home.transition).toEqual(['a', 'b'])
  })
})

describe('<state-query> rendering', () => {
  it('renders query values as text, never as HTML (list format)', async () => {
    const payload = encodeURIComponent('<img src=x onerror="window.__pwned=1">')
    window.location.hash = `#?yg-app=home&msg=${payload}`

    document.body.innerHTML = `
      <state-machine name="app" initial="home">
        <state-def name="home"></state-def>
        <state-query format="list"></state-query>
      </state-machine>`
    await flushUpgrade()

    const sq = document.querySelector('state-query')
    expect(sq.querySelector('img')).toBeNull()
    expect(sq.textContent).toContain('<img')
    expect(window.__pwned).toBeUndefined()
  })

  it('renders keys as text too (json format)', async () => {
    const key = encodeURIComponent('<b>bold</b>')
    window.location.hash = `#?yg-app=home&${key}=1`

    document.body.innerHTML = `
      <state-machine name="app" initial="home">
        <state-def name="home"></state-def>
        <state-query format="json"></state-query>
      </state-machine>`
    await flushUpgrade()

    const sq = document.querySelector('state-query')
    expect(sq.querySelector('b')).toBeNull()
    expect(sq.querySelector('pre')).not.toBeNull()
  })
})
