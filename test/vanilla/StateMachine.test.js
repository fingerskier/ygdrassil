import { describe, it, expect, vi, afterEach } from 'vitest'
import { StateMachine } from '../../vanilla/StateMachine.js'

const machines = []
const makeMachine = (config) => {
  const m = new StateMachine(config)
  machines.push(m)
  return m
}
afterEach(() => {
  while (machines.length) machines.pop().destroy()
})

describe('vanilla StateMachine: baseline', () => {
  it('adopts the initial state and writes it to the URL', () => {
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {} } })
    expect(m.currentState).toBe('home')
    expect(window.location.hash).toContain('yg-app=home')
  })

  it('adopts an existing URL state over initial', () => {
    window.location.hash = '#?yg-app=about'
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {}, about: {} } })
    expect(m.currentState).toBe('about')
  })

  it('gotoState navigates and fires hooks in order', () => {
    const order = []
    const m = makeMachine({
      name: 'app',
      initial: 'home',
      onEnter: (s) => order.push(`global-enter:${s}`),
      onExit: (s) => order.push(`global-exit:${s}`),
      states: {
        home: { onExit: () => order.push('state-exit:home') },
        about: { onEnter: () => order.push('state-enter:about') },
      },
    })
    order.length = 0
    m.gotoState('about')
    expect(m.currentState).toBe('about')
    expect(order).toEqual(['state-exit:home', 'state-enter:about', 'global-exit:home', 'global-enter:about'])
  })

  it('gotoState refuses a transition not in the allow list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = makeMachine({ name: 'app', initial: 'a', states: { a: { transition: ['b'] }, b: {}, c: {} } })
    m.gotoState('c')
    expect(m.currentState).toBe('a')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not allowed'))
    warn.mockRestore()
  })

  it('close removes the param and runs exit hooks', () => {
    const stateExit = vi.fn()
    const globalExit = vi.fn()
    const m = makeMachine({
      name: 'app', initial: 'home', onExit: globalExit,
      states: { home: { onExit: stateExit } },
    })
    m.close()
    expect(m.currentState).toBeNull()
    expect(window.location.hash).not.toContain('yg-app')
    expect(stateExit).toHaveBeenCalledTimes(1)
    expect(globalExit).toHaveBeenCalledWith('home')
  })

  it('setQuery merges params and getQuery reads them', () => {
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {} } })
    m.setQuery({ user: 'kim' })
    expect(m.getQuery().user).toBe('kim')
    expect(m.getQuery()['yg-app']).toBe('home')
  })

  it('fires state-level then global onEnter for a configured initial state', () => {
    const order = []
    makeMachine({
      name: 'app',
      initial: 'home',
      onEnter: (s) => order.push(`global:${s}`),
      states: { home: { onEnter: () => order.push('state:home') } },
    })
    expect(order).toEqual(['state:home', 'global:home'])
  })

  it('fires hooks when adopting an existing URL state', () => {
    window.location.hash = '#?yg-app=about'
    const order = []
    makeMachine({
      name: 'app',
      initial: 'home',
      onEnter: (s) => order.push(`global:${s}`),
      states: { about: { onEnter: () => order.push('state:about') } },
    })
    expect(order).toEqual(['state:about', 'global:about'])
  })

  it('back-fills state-level onEnter when the active state registers late', () => {
    const m = makeMachine({ name: 'app', initial: 'home' }) // no states yet (elements pattern)
    const onEnter = vi.fn()
    m.registerState('home', { onEnter })
    expect(onEnter).toHaveBeenCalledTimes(1)
    m.registerState('home', { onEnter }) // idempotent — re-registering must not re-fire
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('repairs the URL when a hash-driven transition is rejected', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = makeMachine({ name: 'app', initial: 'a', states: { a: { transition: ['b'] }, b: {}, c: {} } })

    // Simulate address-bar edit / back-button: URL changes first, then the event fires.
    window.location.hash = '#?yg-app=c&keep=1'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(m.currentState).toBe('a')
    expect(window.location.hash).toContain('yg-app=a')
    expect(window.location.hash).toContain('keep=1')
    warn.mockRestore()
  })

  it('getAvailableTransitions returns null for unrestricted and [] for terminal', () => {
    const m = makeMachine({ name: 'app', initial: 'a', states: { a: {}, b: { transition: [] }, c: { transition: ['a'] } } })
    expect(m.getAvailableTransitions()).toBeNull()
    m.gotoState('b')
    expect(m.getAvailableTransitions()).toEqual([])
  })

  it('subscribe notifies on state change and unsubscribe stops it', () => {
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {}, about: {} } })
    const listener = vi.fn()
    const unsub = m.subscribe(listener)
    m.gotoState('about')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ currentState: 'about' }))
    unsub()
    listener.mockClear()
    m.gotoState('home')
    expect(listener).not.toHaveBeenCalled()
  })
})
