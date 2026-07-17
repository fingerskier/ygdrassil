import { describe, it, expect, afterEach } from 'vitest'
import '../../vanilla/StateMachine.elements.js'

// Custom elements upgrade synchronously in jsdom when innerHTML parses,
// but give microtasks a chance for observer callbacks.
const flushUpgrade = () => Promise.resolve()

afterEach(() => {
  document.body.innerHTML = ''
  window.location.hash = ''
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
