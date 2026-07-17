# Ygdrassil Remediation Implementation Plan

> **STATUS: EXECUTED 2026-07-17.** All 14 tasks completed on `feat/remediation-2026-07`,
> merged to `main` at `4ec38e8`, pushed, CI green (112 tests). One deviation: the tsup
> DTS build required a dedicated `tsconfig.lib.json` (the root solution-style tsconfig
> carries no `jsx` flag). Remaining release steps: `npm publish` (v2026.2.0) and
> `npm run deploy` for the gh-pages demo. The deferred-items table at the bottom is
> still the live backlog.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verified P0/P1 findings from `plan/FINDINGS.GROK.md` and `plan/FINDINGS.CODEX.md` — URL/state desync, lifecycle parity, `availableTransitions` semantics, the `<state-query>` XSS, and npm packaging — without expanding the library's intentionally small scope.

**Architecture:** Ygdrassil stays a hash-synced SPA state machine with two parallel implementations (React `src/StateMachine.tsx`, vanilla `vanilla/StateMachine.js` + `vanilla/StateMachine.elements.js`). Every behavioral fix lands in both flavors in the same task, with the transition model resolved as: **the transition table is authoritative; a rejected URL-driven navigation repairs the URL back to the current state via `history.replaceState` (no new history entry, no re-dispatch).** Packaging moves to a compiled `dist/` build with React as a peer dependency.

**Tech Stack:** React 19, TypeScript ~5.8, Vite 6, Vitest 4 (jsdom), tsup (new devDep), GitHub Actions.

**Verified findings baseline (2026-07-17):** All P0s confirmed in source. 77/77 React tests pass, lint has 2 `react-refresh` warnings, build passes, `npm pack --dry-run` = 25.4 kB tarball containing raw `src/StateMachine.tsx` + all of `vanilla/` (demo HTML included). `public/StateMachine*.js` are currently byte-identical to `vanilla/` copies. No CI exists.

## Global Constraints

- **No new runtime dependencies.** React becomes a `peerDependency`; `tsup` is a devDependency only.
- **Parity rule:** any behavior change to transitions/lifecycle/query must be implemented in BOTH `src/StateMachine.tsx` and `vanilla/StateMachine.js` (and `vanilla/StateMachine.elements.js` where it applies) within the same task.
- **TDD:** write the failing test, see it fail, implement, see it pass. Full suite (`npm run test:run`) must be green at every commit.
- **Scope discipline:** P3 items in FINDINGS.GROK.md (hierarchical FSM, pathname routing, XState interop, SSR support, persistence) are explicit non-goals. Do not implement them.
- **Deliberately deferred (documented, not changed):** query numeric coercion stays as-is (tested feature; footgun documented in Task 14); `onenter`/`onexit` global-function attributes on `<state-def>` stay (documented as legacy; `CustomEvent`s are the recommended path).
- **Versioning:** single bump `2026.1.6` → `2026.2.0` in Task 11 (breaking: `availableTransitions` type, `gotoState` return type, packaged entry paths).
- **Windows dev box:** npm scripts must be cross-platform (use `node` scripts, no `cp`/bash-isms).
- **Commits:** commit locally after each task (message given per task). Do not push.
- **Test-change policy:** existing tests may be modified ONLY where this plan says they encode a finding's buggy behavior (each such test is named explicitly in its task). Any other existing-test failure is a regression — stop and fix the implementation, not the test.

---

### Task 1: Vanilla test infrastructure + characterization baseline

The vanilla core has zero automated coverage (FINDINGS.CODEX P2). Later tasks need somewhere to put their red tests, so this lands first with green characterization tests of current behavior.

**Files:**
- Modify: `vitest.config.ts:15`
- Create: `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Produces: test file `test/vanilla/StateMachine.test.js` that Tasks 3–7 append to; `makeMachine(config)` helper that auto-destroys machines after each test.

- [ ] **Step 1: Widen the vitest include pattern**

In `vitest.config.ts` change the `include` line:

```ts
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.test.{js,ts}'],
```

Note: `setupFiles: ['./src/test/setup.ts']` already applies to all test files — its hash reset and `pushState`/`replaceState` mocks (which mirror URL changes into `window.location.hash`) are exactly what the vanilla tests need. Do not duplicate them.

- [ ] **Step 2: Write characterization tests (these must pass against current code)**

Create `test/vanilla/StateMachine.test.js`:

```js
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
```

- [ ] **Step 3: Run the new file — all green (characterization, not red)**

Run: `npx vitest run test/vanilla/StateMachine.test.js`
Expected: 7 passed. (One caveat: the `setQuery` test relies on jsdom's native `location.hash` assignment, which fires `hashchange` asynchronously — that's fine here because `getQuery()` reads the URL directly.)

- [ ] **Step 4: Run the full suite**

Run: `npm run test:run`
Expected: 84 passed (77 React + 7 vanilla).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts test/vanilla/StateMachine.test.js
git commit -m "test: add vanilla StateMachine characterization suite"
```

---

### Task 2: React — rejected hash navigation repairs the URL; param removal runs onExit

Fixes FINDINGS.GROK P0#1 + P0#2 (React side). Restructures the hashchange handler so lifecycle hooks no longer run inside the `setCurrentState` updater (impure under StrictMode), rejection repairs the URL, and param removal runs exit hooks (parity with vanilla).

**Files:**
- Modify: `src/StateMachine.tsx:154-175` (replace `transitionToState`), `src/StateMachine.tsx:292-306` (replace hashchange effect)
- Test: `src/StateMachine.test.tsx`

**Interfaces:**
- Produces: internal `applyTransition(next: string): boolean` (validates, runs hooks, commits, returns `false` on denial). Task 6 extends it with `onTransitionDenied` and reuses its boolean for `gotoState`'s return value. `currentRef` is now updated synchronously inside `applyTransition`.

- [ ] **Step 1: Write the failing tests**

Append to `src/StateMachine.test.tsx` (inside the top-level `describe('StateMachine')`, after the `availableTransitions` describe):

```tsx
  describe('URL repair on rejected navigation', () => {
    it('repairs the URL when a hash navigation is rejected', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={['page2']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <State name="page3"><div>Page 3</div></State>
        </StateMachine>
      )

      await act(async () => {
        setHash('#?yg-test=page3')
      })

      expect(screen.getByText('Page 1')).toBeInTheDocument()
      expect(window.location.hash).toBe('#?yg-test=page1')
      warn.mockRestore()
    })

    it('repair preserves other machines\' params and foreign query keys', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={['page2']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
        </StateMachine>
      )

      await act(async () => {
        setHash('#?yg-test=page9&yg-other=zzz&keep=1')
      })

      expect(window.location.hash).toContain('yg-test=page1')
      expect(window.location.hash).toContain('yg-other=zzz')
      expect(window.location.hash).toContain('keep=1')
      warn.mockRestore()
    })
  })

  describe('close lifecycle parity', () => {
    it('runs state-level and global onExit when the machine param is removed', async () => {
      const stateOnExit = vi.fn()
      const globalOnExit = vi.fn()
      const CloseButton = () => {
        const { close } = useStateMachine()
        return <button onClick={close}>Close</button>
      }

      render(
        <StateMachine initial="page1" name="test" onExit={globalOnExit}>
          <State name="page1" onExit={stateOnExit}><div>Page 1</div></State>
          <CloseButton />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Close'))
      })

      expect(stateOnExit).toHaveBeenCalledTimes(1)
      expect(globalOnExit).toHaveBeenCalledWith('page1')
    })

    it('runs onExit when the yg- param is removed by direct URL edit', async () => {
      const stateOnExit = vi.fn()
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" onExit={stateOnExit}><div>Page 1</div></State>
        </StateMachine>
      )

      await act(async () => {
        setHash('#?unrelated=1')
      })

      expect(stateOnExit).toHaveBeenCalledTimes(1)
    })
  })
```

- [ ] **Step 2: Run to verify the 4 new tests fail**

Run: `npx vitest run src/StateMachine.test.tsx -t "URL repair"` and `npx vitest run src/StateMachine.test.tsx -t "close lifecycle"`
Expected: FAIL — hash stays `#?yg-test=page3` (no repair); `stateOnExit` never called.

- [ ] **Step 3: Implement**

In `src/StateMachine.tsx` replace the whole `transitionToState` callback (lines 154-175) with:

```tsx
  /* ---------- State transition handlers ---------- */
  // Validates, runs lifecycle hooks, and commits a transition.
  // Returns false when the current state's transition list denies the move.
  const applyTransition = useCallback(
    (next: string): boolean => {
      const prev = currentRef.current
      if (prev === next) return true // no-op
      const allowed = prev ? statesRef.current[prev]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${prev}" to "${next}" not allowed.`)
        return false
      }
      if (prev) statesRef.current[prev]?.onExit?.()
      statesRef.current[next]?.onEnter?.()
      if (prev) globalOnExit?.(prev)
      globalOnEnter?.(next)
      currentRef.current = next
      setCurrentState(next)
      return true
    },
    [globalOnEnter, globalOnExit],
  )
```

Replace the hashchange effect (previously lines 292-306) with:

```tsx
  /* ---------- Watch for external hash changes ---------- */
  useEffect(() => {
    const handler = () => {
      const next = readParam()
      if (next) {
        if (next !== currentRef.current) {
          const accepted = applyTransition(next)
          if (!accepted) {
            // URL claimed a forbidden state: repair our param back to the
            // current state without adding a history entry or re-dispatching
            // (re-dispatch could ping-pong between machines).
            const prev = currentRef.current as string // denial implies a prior state
            const search = window.location.hash.startsWith('#?')
              ? window.location.hash.slice(2)
              : ''
            const params = new URLSearchParams(search)
            params.set(machineStateParam, prev)
            window.history.replaceState(null, '', `#?${params.toString()}`)
          }
        }
      } else if (currentRef.current) {
        // Param removed (close() or URL edit): run exit hooks, then clear.
        const prev = currentRef.current
        statesRef.current[prev]?.onExit?.()
        globalOnExit?.(prev)
        currentRef.current = undefined
        setCurrentState(undefined)
      }
      setQueryState(readQuery())
    }
    handler()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [applyTransition, readParam, readQuery, machineStateParam, globalOnExit])
```

Keep the `currentRef` sync effect at lines 132-135 (it is now redundant on the transition path but still covers `setCurrentState(undefined)` ordering; harmless).

- [ ] **Step 4: Run the full suite**

Run: `npm run test:run`
Expected: all pass (81 React + 7 vanilla). If any pre-existing test fails, the restructure broke behavior — fix the implementation. (The existing rejection tests at `src/StateMachine.test.tsx:253` and `:1199` assert the warning text, which is unchanged.)

- [ ] **Step 5: Commit**

```bash
git add src/StateMachine.tsx src/StateMachine.test.tsx
git commit -m "fix(react): repair URL on rejected hash navigation; run onExit on param removal"
```

---

### Task 3: Vanilla — rejected hash navigation repairs the URL

Same fix as Task 2, vanilla side (FINDINGS.GROK P0#1; vanilla close/onExit parity already correct).

**Files:**
- Modify: `vanilla/StateMachine.js:206-227` (`_transitionToState`), add `_repairParam` helper
- Test: `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Consumes: `makeMachine` helper from Task 1.
- Produces: `_transitionToState(nextState)` now returns `boolean`; `_repairParam(state)` private helper. Task 6 reuses both.

- [ ] **Step 1: Write the failing test**

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla StateMachine: URL repair on rejected navigation', () => {
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
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/vanilla/StateMachine.test.js -t "repairs the URL"`
Expected: FAIL — hash still contains `yg-app=c`.

- [ ] **Step 3: Implement**

In `vanilla/StateMachine.js`, add after `_writeParam` (after line 123):

```js
  /**
   * Rewrite this machine's param back to a state without adding a history
   * entry and without re-dispatching hashchange (avoids loops between machines).
   * @private
   */
  _repairParam(state) {
    const currentHash = window.location.hash.startsWith('#?')
      ? window.location.hash.slice(2)
      : ''
    const params = new URLSearchParams(currentHash)
    params.set(this.param, state)
    window.history.replaceState(null, '', `#?${params.toString()}`)
  }
```

In `_transitionToState`, change the rejection branch and add a return value:

```js
  _transitionToState(nextState) {
    const prevState = this.currentState
    const prev = prevState ? this.states[prevState] : null
    const next = this.states[nextState]

    // Check if transition is allowed
    if (prev?.transition && !prev.transition.includes(nextState)) {
      console.warn(`Transition from "${prevState}" to "${nextState}" not allowed.`)
      // The URL already shows the forbidden state — repair it.
      if (prevState) this._repairParam(prevState)
      return false
    }

    // Execute state-level handlers
    if (prev?.onExit) prev.onExit()
    if (next?.onEnter) next.onEnter()

    // Execute global handlers
    if (prevState && this.globalOnExit) this.globalOnExit(prevState)
    if (this.globalOnEnter) this.globalOnEnter(nextState)

    this.currentState = nextState
    this._notifyListeners()
    return true
  }
```

- [ ] **Step 4: Run the full suite**

Run: `npm run test:run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add vanilla/StateMachine.js test/vanilla/StateMachine.test.js
git commit -m "fix(vanilla): repair URL when a hash-driven transition is rejected"
```

---

### Task 4: State-level `onEnter` fires for the initial / deep-linked state (both flavors)

Fixes FINDINGS.GROK P0#3 / FINDINGS.CODEX P1-lifecycle. Contract: on machine startup (initial prop, deep link, or URL adoption), the active state's `onEnter` runs once, then the global `onEnter`. If the state's definition registers after startup (React children mounting, elements discovery), the state-level hook is back-filled at registration time; it never fires twice.

**Files:**
- Modify: `src/StateMachine.tsx` (registerState, initial-enter effect, `applyTransition`)
- Modify: `vanilla/StateMachine.js` (`_init`, `registerState`, `_transitionToState`)
- Test: `src/StateMachine.test.tsx`, `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Consumes: `applyTransition` from Task 2, `_transitionToState` boolean from Task 3.
- Produces: React ref `initialEnterFiredRef`; vanilla fields `_initialEnterFired`, `_initialStateEnterPending`. No public API change.

- [ ] **Step 1: Write the failing React tests**

Append to `src/StateMachine.test.tsx`:

```tsx
  describe('initial state-level onEnter', () => {
    it('calls state-level onEnter for the initial state, before global onEnter', async () => {
      const order: string[] = []
      render(
        <StateMachine initial="page1" name="test" onEnter={(s) => order.push(`global:${s}`)}>
          <State name="page1" onEnter={() => order.push('state:page1')}><div>Page 1</div></State>
        </StateMachine>
      )

      await waitFor(() => expect(order).toEqual(['state:page1', 'global:page1']))
    })

    it('calls state-level onEnter for a deep-linked state', async () => {
      setHash('#?yg-test=page2')
      const onEnter = vi.fn()
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2" onEnter={onEnter}><div>Page 2</div></State>
        </StateMachine>
      )

      await waitFor(() => expect(onEnter).toHaveBeenCalledTimes(1))
    })

    it('does not double-fire when transitioning after mount', async () => {
      const onEnter = vi.fn()
      const Nav = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => gotoState('page2')}>Go</button>
      }
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" onEnter={onEnter}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <Nav />
        </StateMachine>
      )
      await waitFor(() => expect(onEnter).toHaveBeenCalledTimes(1))

      await act(async () => { fireEvent.click(screen.getByText('Go')) })
      expect(onEnter).toHaveBeenCalledTimes(1) // still once — page1 was exited, not re-entered
    })
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/StateMachine.test.tsx -t "initial state-level onEnter"`
Expected: first two FAIL (state-level hook never called); third may pass trivially — keep it as a regression guard.

- [ ] **Step 3: Implement (React)**

In `src/StateMachine.tsx`:

a) Add a ref next to `initialOnEnterCalledRef` (replacing it — delete the old ref and its effect at lines 281-289):

```tsx
  /* ---------- Initial enter (state-level + global), fired exactly once ---------- */
  const initialEnterFiredRef = useRef(false)
  const fireInitialEnter = useCallback((name: string) => {
    if (initialEnterFiredRef.current) return
    initialEnterFiredRef.current = true
    statesRef.current[name]?.onEnter?.()
    globalOnEnter?.(name)
  }, [globalOnEnter])

  useEffect(() => {
    // Fallback for an active state that has no <State> child (undeclared name):
    // children's registration effects have already run by the time this fires.
    if (currentState) fireInitialEnter(currentState)
  }, [currentState, fireInitialEnter])
```

b) Extend `registerState` so a matching definition that registers first triggers the initial enter with the state-level hook available:

```tsx
  const registerState = useCallback((name: string, definition: StateDefinition) => {
    statesRef.current[name] = definition
    setVersion(v => v + 1)
    if (name === currentRef.current) fireInitialEnter(name)
  }, [fireInitialEnter])
```

c) In `applyTransition` (from Task 2), mark the initial enter as consumed when a transition commits, so a `<State>` registering later for an already-entered state can't re-fire:

```tsx
      if (prev) statesRef.current[prev]?.onExit?.()
      statesRef.current[next]?.onEnter?.()
      if (prev) globalOnExit?.(prev)
      globalOnEnter?.(next)
      initialEnterFiredRef.current = true
      currentRef.current = next
      setCurrentState(next)
      return true
```

- [ ] **Step 4: Run the React suite; reconcile pre-existing global-onEnter tests**

Run: `npx vitest run src/StateMachine.test.tsx`
Expected: the three new tests pass. The existing `Global onEnter and onExit handlers` describe (from `src/StateMachine.test.tsx:1281`) asserts global `onEnter` timing — the global hook still fires exactly once on mount, so those should stay green. **Only if** an existing test asserts that the initial state's *state-level* `onEnter` was NOT called, update that assertion to expect exactly one call (this is the P0#3 contract change). Do not weaken any other assertion.

- [ ] **Step 5: Write the failing vanilla tests**

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla StateMachine: initial enter', () => {
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
})
```

- [ ] **Step 6: Run to verify they fail**

Run: `npx vitest run test/vanilla/StateMachine.test.js -t "initial enter"`
Expected: all three FAIL (current `_init` fires only global onEnter, only on the initial-write path).

- [ ] **Step 7: Implement (vanilla)**

In `vanilla/StateMachine.js`:

a) In the constructor, after `this._listeners = []` add:

```js
    this._initialStateEnterPending = false
```

b) Replace `_init` (lines 59-77):

```js
  _init(initial) {
    // Read current state from URL
    const urlState = this._readParam()
    const target = urlState || initial

    if (target) {
      this.currentState = target
      if (!urlState) this._writeParam(target)
      const def = this.states[target]
      if (def?.onEnter) {
        def.onEnter()
      } else {
        // Definition not registered yet (e.g. web-component discovery runs
        // after construction) — back-fill in registerState.
        this._initialStateEnterPending = true
      }
      if (this.globalOnEnter) this.globalOnEnter(target)
    }

    // Listen for hash changes
    window.addEventListener('hashchange', this._handleHashChange)
  }
```

c) In `registerState`, after storing the definition (line 242) and before `_notifyListeners()`:

```js
    if (this._initialStateEnterPending && name === this.currentState) {
      this._initialStateEnterPending = false
      if (this.states[name].onEnter) this.states[name].onEnter()
    }
```

d) In `_transitionToState`, at the top of the commit path (right before the state-level handlers), clear the pending flag so a late registration can't re-fire after a real transition:

```js
    this._initialStateEnterPending = false
```

- [ ] **Step 8: Run the full suite**

Run: `npm run test:run`
Expected: all pass (note: Task 1's baseline test `gotoState navigates and fires hooks in order` clears `order` before navigating, so the new initial-enter calls don't break it).

- [ ] **Step 9: Commit**

```bash
git add src/StateMachine.tsx vanilla/StateMachine.js src/StateMachine.test.tsx test/vanilla/StateMachine.test.js
git commit -m "fix: fire state-level onEnter for initial and deep-linked states"
```

---

### Task 5: `availableTransitions` — `null` means unrestricted, `[]` means terminal

Fixes FINDINGS.GROK P0#4 (option A, recommended there). Breaking type change: `string[]` → `string[] | null`.

**Files:**
- Modify: `src/StateMachine.tsx:36` (Ctx type), `:318-320` (context builder)
- Modify: `vanilla/StateMachine.js:304-307` (`getAvailableTransitions`)
- Modify: `src/StateMachine.test.tsx:478-495` (the test that encodes the bug)
- Modify: `src/com/Second/Controls.tsx:18-22` (demo UI), `src/com/Docs/HookDoc.tsx:40-44` (API table row)
- Test: `src/StateMachine.test.tsx`, `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Produces: `Ctx.availableTransitions: string[] | null`; vanilla `getAvailableTransitions(): string[] | null`. Task 14's README edits document this.

- [ ] **Step 1: Update the encoding test + add new tests (red)**

In `src/StateMachine.test.tsx`, rewrite the test at lines 478-495 (`'returns empty array when no transitions defined'`):

```tsx
    it('returns null (unrestricted) when no transitions are defined', () => {
      let transitions: string[] | null = ['should be replaced']

      const TestComponent = () => {
        const { availableTransitions } = useStateMachine()
        transitions = availableTransitions
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(transitions).toBeNull()
    })

    it('returns an empty array for an explicitly terminal state', () => {
      let transitions: string[] | null = null

      const TestComponent = () => {
        const { availableTransitions } = useStateMachine()
        transitions = availableTransitions
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={[]}><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(transitions).toEqual([])
    })
```

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla StateMachine: getAvailableTransitions', () => {
  it('returns null for unrestricted and [] for terminal', () => {
    const m = makeMachine({ name: 'app', initial: 'a', states: { a: {}, b: { transition: [] }, c: { transition: ['a'] } } })
    expect(m.getAvailableTransitions()).toBeNull()
    m.gotoState('b')
    expect(m.getAvailableTransitions()).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify the new/changed tests fail**

Run: `npx vitest run src/StateMachine.test.tsx -t "availableTransitions"` and `npx vitest run test/vanilla/StateMachine.test.js -t "getAvailableTransitions"`
Expected: FAIL (`[]` returned where `null` expected).

- [ ] **Step 3: Implement**

`src/StateMachine.tsx` line 36:

```tsx
  availableTransitions: string[] | null
```

Context builder (lines 318-320):

```tsx
        availableTransitions: currentState
          ? statesRef.current[currentState]?.transition ?? null
          : null,
```

`vanilla/StateMachine.js` `getAvailableTransitions`:

```js
  /**
   * Get available transitions from current state.
   * @returns {string[] | null} Allowed next states; null means unrestricted
   *   (any state), an empty array means terminal (no transitions allowed).
   */
  getAvailableTransitions() {
    if (!this.currentState) return null
    return this.states[this.currentState]?.transition ?? null
  }
```

Wait — `b: { transition: [] }` with the guard `prev?.transition && !prev.transition.includes(...)`: an empty array is falsy-safe (`[] &&` is truthy, `includes` false) so a terminal state correctly denies everything. `m.gotoState('b')` from unrestricted `a` is allowed. No guard change needed.

`src/com/Second/Controls.tsx` — replace lines 18-22:

```tsx
        Allowed Transitions {currentState ? `(from ${currentState})` : ''}:
        {availableTransitions === null
            ? <em> any (unrestricted)</em>
            : availableTransitions.map(
                state => <StateButton key={state} to={state}>{state}</StateButton>
              )}
```

`src/com/Docs/HookDoc.tsx` — replace the `availableTransitions` table row (lines 40-44):

```tsx
          <tr>
            <td>availableTransitions</td>
            <td>string[] | null</td>
            <td>Allowed next states; null means unrestricted, [] means terminal</td>
          </tr>
```

Also update the usage snippet in the same file (line 75): `if (availableTransitions?.includes('nextStep') ?? true) {`

- [ ] **Step 4: Run the full suite + typecheck**

Run: `npm run test:run` then `npm run build`
Expected: tests pass; `tsc -b` clean (the type change surfaces any demo code still assuming `string[]` — fix those call sites the same way as `Second/Controls.tsx`).

- [ ] **Step 5: Commit**

```bash
git add src/StateMachine.tsx vanilla/StateMachine.js src/StateMachine.test.tsx test/vanilla/StateMachine.test.js src/com/Second/Controls.tsx src/com/Docs/HookDoc.tsx
git commit -m "feat!: availableTransitions null=unrestricted, []=terminal"
```

---

### Task 6: `gotoState` returns boolean; `onTransitionDenied` callback

Fixes FINDINGS.GROK P2#17 (no error channel). Small API addition on both flavors.

**Files:**
- Modify: `src/StateMachine.tsx` (Ctx type, `gotoState`, `StateMachineProps`, hashchange handler)
- Modify: `vanilla/StateMachine.js` (constructor config, `gotoState`, `_transitionToState`)
- Test: `src/StateMachine.test.tsx`, `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Consumes: `applyTransition` (Task 2), `_transitionToState` boolean + `_repairParam` (Task 3).
- Produces: `gotoState(...): boolean` (both flavors); React prop / vanilla config `onTransitionDenied?: (from: string | undefined|null, to: string) => void`.

- [ ] **Step 1: Write the failing tests**

Append to `src/StateMachine.test.tsx`:

```tsx
  describe('transition denial reporting', () => {
    it('gotoState returns false and fires onTransitionDenied on a denied move', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const denied = vi.fn()
      let result: boolean | undefined

      const Nav = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => { result = gotoState('page3') }}>Go</button>
      }

      render(
        <StateMachine initial="page1" name="test" onTransitionDenied={denied}>
          <State name="page1" transition={['page2']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <State name="page3"><div>Page 3</div></State>
          <Nav />
        </StateMachine>
      )

      await act(async () => { fireEvent.click(screen.getByText('Go')) })

      expect(result).toBe(false)
      expect(denied).toHaveBeenCalledWith('page1', 'page3')
      expect(screen.getByText('Page 1')).toBeInTheDocument()
      warn.mockRestore()
    })

    it('gotoState returns true on an accepted move', async () => {
      let result: boolean | undefined
      const Nav = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => { result = gotoState('page2') }}>Go</button>
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <Nav />
        </StateMachine>
      )

      await act(async () => { fireEvent.click(screen.getByText('Go')) })
      expect(result).toBe(true)
    })

    it('fires onTransitionDenied for a rejected hash navigation', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const denied = vi.fn()
      render(
        <StateMachine initial="page1" name="test" onTransitionDenied={denied}>
          <State name="page1" transition={['page2']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <State name="page3"><div>Page 3</div></State>
        </StateMachine>
      )

      await act(async () => { setHash('#?yg-test=page3') })
      expect(denied).toHaveBeenCalledWith('page1', 'page3')
      warn.mockRestore()
    })
  })
```

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla StateMachine: transition denial reporting', () => {
  it('gotoState returns boolean and fires onTransitionDenied', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const denied = vi.fn()
    const m = makeMachine({
      name: 'app', initial: 'a', onTransitionDenied: denied,
      states: { a: { transition: ['b'] }, b: {}, c: {} },
    })
    expect(m.gotoState('c')).toBe(false)
    expect(denied).toHaveBeenCalledWith('a', 'c')
    expect(m.gotoState('b')).toBe(true)
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run -t "denial"`
Expected: FAIL (`result`/return is `undefined`; `denied` never called; React also TS-errors on the unknown `onTransitionDenied` prop — that error IS the red state).

- [ ] **Step 3: Implement (React)**

`src/StateMachine.tsx`:

a) `Ctx.gotoState` type (lines 29-33): change return `void` → `boolean`.

b) `StateMachineProps` — add:

```tsx
  /** Called when a transition is denied by the current state's transition list */
  onTransitionDenied?: (from: string | undefined, to: string) => void
```

and destructure it in the component signature: `onTransitionDenied`.

c) `applyTransition` denial branch — before `return false`:

```tsx
        onTransitionDenied?.(prev, next)
```

and add `onTransitionDenied` to `applyTransition`'s dependency array.

d) `gotoState` — return booleans (denial path already warns; add callback):

```tsx
      const current = currentRef.current
      if (current === next && !data) return true // no-op if same state and no data changes

      const allowed = current ? statesRef.current[current]?.transition : undefined
      if (allowed && !allowed.includes(next)) {
        console.warn(`Transition from "${current}" to "${next}" not allowed.`)
        onTransitionDenied?.(current, next)
        return false
      }
      ...
      window.dispatchEvent(new HashChangeEvent('hashchange'))
      return true
```

Add `onTransitionDenied` to `gotoState`'s dependency array.

- [ ] **Step 4: Implement (vanilla)**

`vanilla/StateMachine.js`:

a) Constructor: `this.onTransitionDenied = config.onTransitionDenied` (document in the constructor JSDoc: `@param {Function} [config.onTransitionDenied] - Called with (from, to) when a transition is denied`).

b) `_transitionToState` denial branch — before `return false`:

```js
      if (this.onTransitionDenied) this.onTransitionDenied(prevState, nextState)
```

c) `gotoState` — return booleans:

```js
  gotoState(nextState, data = null, replace = false) {
    if (this.currentState === nextState && !data) {
      return true // No-op if same state and no data changes
    }

    const current = this.states[this.currentState]
    if (current?.transition && !current.transition.includes(nextState)) {
      console.warn(`Transition from "${this.currentState}" to "${nextState}" not allowed.`)
      if (this.onTransitionDenied) this.onTransitionDenied(this.currentState, nextState)
      return false
    }

    this._writeParam(nextState, data, replace)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return true
  }
```

- [ ] **Step 5: Run the full suite**

Run: `npm run test:run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/StateMachine.tsx vanilla/StateMachine.js src/StateMachine.test.tsx test/vanilla/StateMachine.test.js
git commit -m "feat: gotoState returns boolean; add onTransitionDenied callback"
```

---

### Task 7: `setQuery` — one hash-write path, live-URL read (kills the cross-machine race)

Fixes FINDINGS.GROK P1#8 (history API inconsistency) and FINDINGS.CODEX P1 (query ownership race). `setQuery` now reads the live hash immediately before writing and uses the same `pushState` + synthetic-event path as `gotoState`.

**Files:**
- Modify: `src/StateMachine.tsx:236-263` (`setQuery`)
- Modify: `vanilla/StateMachine.js:148-174` (`setQuery`)
- Test: `src/StateMachine.test.tsx`, `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Produces: no signature change — `setQuery(obj, replace?)` on both flavors; behavior now: live-hash merge, `history.pushState`, synchronous `hashchange` dispatch.

- [ ] **Step 1: Write the failing tests**

Append to `src/StateMachine.test.tsx`:

```tsx
  describe('setQuery write path', () => {
    it('preserves a param another machine wrote in the same tick', async () => {
      let setQueryA: ((o: Record<string, string | number | null | undefined>) => void) | undefined
      let setQueryB: ((o: Record<string, string | number | null | undefined>) => void) | undefined
      const GrabA = () => { setQueryA = useStateMachine().setQuery; return null }
      const GrabB = () => { setQueryB = useStateMachine().setQuery; return null }

      render(
        <>
          <StateMachine initial="a1" name="ma">
            <State name="a1"><div>A1</div></State>
            <GrabA />
          </StateMachine>
          <StateMachine initial="b1" name="mb">
            <State name="b1"><div>B1</div></State>
            <GrabB />
          </StateMachine>
        </>
      )

      await act(async () => {
        setQueryA!({ alpha: 1 })
        setQueryB!({ beta: 2 })
      })

      expect(window.location.hash).toContain('alpha=1')
      expect(window.location.hash).toContain('beta=2')
    })

    it('replace=true clears only non-yg- params', async () => {
      let setQueryFn: ((o: Record<string, string | number | null | undefined>, r?: boolean) => void) | undefined
      const Grab = () => { setQueryFn = useStateMachine().setQuery; return null }

      render(
        <StateMachine initial="a1" name="ma">
          <State name="a1"><div>A1</div></State>
          <Grab />
        </StateMachine>
      )

      await act(async () => { setQueryFn!({ old: 'x' }) })
      await act(async () => { setQueryFn!({ fresh: 'y' }, true) })

      expect(window.location.hash).toContain('yg-ma=a1')
      expect(window.location.hash).toContain('fresh=y')
      expect(window.location.hash).not.toContain('old=x')
    })
  })
```

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla StateMachine: setQuery write path', () => {
  it('notifies subscribers synchronously after setQuery', () => {
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {} } })
    const listener = vi.fn()
    m.subscribe(listener)
    m.setQuery({ user: 'kim' })
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ user: 'kim' }) }))
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run -t "setQuery"`
Expected: the two-machine test FAILS (`alpha=1` dropped — machine B rebuilt the hash from its stale React state). The vanilla sync-notify test FAILS (jsdom fires the native hashchange asynchronously). The `replace` React test may pass already — keep it as a regression guard for the rewrite.

- [ ] **Step 3: Implement (React)**

Replace `setQuery` (lines 236-263) with:

```tsx
  const setQuery = useCallback(
    (
      obj: Record<string, string | number | null | undefined>,
      replace = false,
    ) => {
      // Read the LIVE hash (not React state) so interleaved writes from other
      // machines are never clobbered.
      const currentHash = window.location.hash.startsWith('#?')
        ? window.location.hash.slice(2)
        : ''
      const params = new URLSearchParams(currentHash)

      if (replace) {
        for (const key of Array.from(params.keys())) {
          if (!key.startsWith('yg-')) params.delete(key)
        }
      }

      for (const [k, v] of Object.entries(obj)) {
        if (v == null) params.delete(k)
        else params.set(k, String(v))
      }

      window.history.pushState(null, '', `#?${params.toString()}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    },
    [],
  )
```

(The hashchange handler from Task 2 already refreshes `query` state via `setQueryState(readQuery())` — local query state no longer needs manual maintenance.)

- [ ] **Step 4: Implement (vanilla)**

In `vanilla/StateMachine.js` `setQuery`, replace the last two lines (172-173):

```js
    const newHash = `#?${params.toString()}`
    window.history.pushState(null, '', newHash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
```

Note: the synthetic dispatch makes `_handleHashChange` run; the state param is unchanged so it early-returns, but `_notifyListeners` is NOT called on the query-only path there. Add query-change notification: in `_handleHashChange`, replace the `if (nextState === this.currentState) { return }` branch with:

```js
    if (nextState === this.currentState) {
      // State unchanged — but the query may have changed.
      this._notifyListeners()
      return
    }
```

- [ ] **Step 5: Run the full suite**

Run: `npm run test:run`
Expected: all pass. Existing React query tests (`query and setQuery` describe at `src/StateMachine.test.tsx:519`) exercise merge/replace/delete semantics — they must stay green; if one fails, the rewrite changed observable semantics — fix the implementation.

- [ ] **Step 6: Commit**

```bash
git add src/StateMachine.tsx vanilla/StateMachine.js src/StateMachine.test.tsx test/vanilla/StateMachine.test.js
git commit -m "fix: setQuery reads live hash and uses the single pushState write path"
```

---

### Task 8: `<state-query>` XSS fix (DOM building, no innerHTML interpolation)

Fixes FINDINGS.CODEX P1 XSS / FINDINGS.GROK P2#13. URL-derived values must never be interpolated into HTML.

**Files:**
- Modify: `vanilla/StateMachine.elements.js:435-452` (`StateQueryElement._render`)
- Create: `test/vanilla/StateMachine.elements.test.js`

**Interfaces:**
- Produces: element test file that Task 9 appends to; `flushUpgrade()` helper.

- [ ] **Step 1: Write the failing test**

Create `test/vanilla/StateMachine.elements.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/vanilla/StateMachine.elements.test.js`
Expected: FAIL — an `<img>`/`<b>` element exists inside `<state-query>`.

- [ ] **Step 3: Implement**

Replace `StateQueryElement._render` (lines 435-452) with:

```js
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
```

- [ ] **Step 4: Run the full suite**

Run: `npm run test:run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add vanilla/StateMachine.elements.js test/vanilla/StateMachine.elements.test.js
git commit -m "fix(elements): build state-query DOM with textContent (XSS)"
```

---

### Task 9: `<state-def>` reconciliation — removals unregister, transition edits apply

Fixes FINDINGS.CODEX P1 discovery / FINDINGS.GROK P2#15. The registry must track the DOM.

**Files:**
- Modify: `vanilla/StateMachine.elements.js:99-103` (observer options), `:121-156` (`_discoverStates`), constructor (`_defs` map)
- Test: `test/vanilla/StateMachine.elements.test.js`

**Interfaces:**
- Consumes: `flushUpgrade` from Task 8.
- Produces: `StateMachineElement._defs` (Map name → last-seen transition attribute string) alongside existing `_states` (Map name → element).

- [ ] **Step 1: Write the failing tests**

Append to `test/vanilla/StateMachine.elements.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify the last two fail**

Run: `npx vitest run test/vanilla/StateMachine.elements.test.js -t "reconciliation"`
Expected: "registers … after initialization" passes (already works); "unregisters" and "applies a changed transition" FAIL.

- [ ] **Step 3: Implement**

In `StateMachineElement`:

a) Constructor — add:

```js
    this._defs = new Map() // name -> last-seen transition attribute string
```

b) Observer options (line 103) — also watch the attributes that define states:

```js
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['name', 'transition'],
    })
```

c) Replace `_discoverStates` (lines 121-156):

```js
  _discoverStates() {
    const stateElements = this.querySelectorAll('state-def')
    const present = new Set()

    stateElements.forEach(stateEl => {
      const stateName = stateEl.getAttribute('name')
      if (!stateName) return
      present.add(stateName)

      const transitionStr = stateEl.getAttribute('transition') || ''
      const known = this._states.has(stateName)
      const changed = known && this._defs.get(stateName) !== transitionStr
      if (known && !changed) return

      const transition = transitionStr
        ? transitionStr.split(',').map(s => s.trim())
        : undefined

      // registerState is an idempotent overwrite, so re-registering on a
      // definition change replaces the old transition list and callbacks.
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
      this._defs.set(stateName, transitionStr)
    })

    // Unregister states whose <state-def> is gone from the DOM
    for (const name of Array.from(this._states.keys())) {
      if (!present.has(name)) {
        this._machine.unregisterState(name)
        this._states.delete(name)
        this._defs.delete(name)
      }
    }
  }
```

d) In `_reinitialize` (line 117), also clear the new map: `this._defs.clear()`.

Loop-safety note: `<state-nav>`'s `_initialize` mutates `innerHTML`, which re-triggers the observer and `_discoverStates`; with the `known && !changed` early-return, re-runs are cheap no-ops and cannot loop (the observer's attributeFilter excludes `href`/`class` written by nav updates).

- [ ] **Step 4: Run the full suite**

Run: `npm run test:run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add vanilla/StateMachine.elements.js test/vanilla/StateMachine.elements.test.js
git commit -m "fix(elements): reconcile state-def removals and transition edits"
```

---

### Task 10: Navigation controls — honor `preventDefault`, add `aria-current`

Fixes FINDINGS.CODEX P2 (cancellation) + FINDINGS.GROK P2#21 (a11y).

**Files:**
- Modify: `src/StateMachine.tsx` (`StateButton`, `ExternalButton`, `StateLink`)
- Modify: `vanilla/StateMachine.js` (`createStateButton`, `createStateLink`)
- Modify: `vanilla/StateMachine.elements.js` (`StateNavElement._updateActiveClass`)
- Test: `src/StateMachine.test.tsx`, `test/vanilla/StateMachine.test.js`

**Interfaces:**
- Produces: active controls carry `aria-current="page"`; `StateButton`/`ExternalButton` skip navigation when the consumer handler called `event.preventDefault()`.

- [ ] **Step 1: Write the failing tests**

Append to `src/StateMachine.test.tsx`:

```tsx
  describe('navigation control behavior', () => {
    it('StateButton does not navigate when onClick prevents default', async () => {
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <StateButton to="page2" onClick={e => e.preventDefault()}>Go</StateButton>
        </StateMachine>
      )

      await act(async () => { fireEvent.click(screen.getByText('Go')) })
      expect(screen.getByText('Page 1')).toBeInTheDocument()
      expect(screen.queryByText('Page 2')).not.toBeInTheDocument()
    })

    it('StateButton and StateLink mark the active control with aria-current', () => {
      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <StateButton to="page1">B1</StateButton>
          <StateButton to="page2">B2</StateButton>
          <StateLink to="page1">L1</StateLink>
        </StateMachine>
      )

      expect(screen.getByText('B1')).toHaveAttribute('aria-current', 'page')
      expect(screen.getByText('B2')).not.toHaveAttribute('aria-current')
      expect(screen.getByText('L1')).toHaveAttribute('aria-current', 'page')
    })
  })
```

Append to `test/vanilla/StateMachine.test.js`:

```js
describe('vanilla helpers: aria-current', () => {
  it('createStateButton toggles aria-current with active state', async () => {
    const { createStateButton } = await import('../../vanilla/StateMachine.js')
    const m = makeMachine({ name: 'app', initial: 'home', states: { home: {}, about: {} } })
    const btn = createStateButton(m, 'home')
    expect(btn.getAttribute('aria-current')).toBe('page')
    m.gotoState('about')
    expect(btn.getAttribute('aria-current')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run -t "navigation control"` and `npx vitest run test/vanilla/StateMachine.test.js -t "aria-current"`
Expected: FAIL (navigates despite preventDefault; no `aria-current` attributes).

- [ ] **Step 3: Implement (React)**

`StateButton` — replace the return:

```tsx
  return (
    <button
      {...rest}
      className={classNames}
      aria-current={is(to) ? 'page' : undefined}
      onClick={e => {
        onClick?.(e)
        if (e.defaultPrevented) return
        gotoState(to, data, replace)
      }}
    >
      {children ?? to}
    </button>
  )
```

`ExternalButton` — same pattern: after `onClick?.(e)` add `if (e.defaultPrevented) return` before the hash write.

`StateLink` — add to the `<a>`: `aria-current={is(to) ? 'page' : undefined}`.

- [ ] **Step 4: Implement (vanilla)**

`createStateButton` — extend `updateClass`:

```js
  const updateClass = () => {
    const classes = [options.className || '']
    if (machine.is(targetState)) {
      classes.push('active')
      button.setAttribute('aria-current', 'page')
    } else {
      button.removeAttribute('aria-current')
    }
    button.className = classes.filter(Boolean).join(' ')
  }
```

`createStateLink` — same block inside `updateHrefAndClass` (set/remove on `link`).

`StateNavElement._updateActiveClass`:

```js
  _updateActiveClass(to) {
    if (this._machine.is(to)) {
      this._navElement.classList.add('active')
      this._navElement.setAttribute('aria-current', 'page')
    } else {
      this._navElement.classList.remove('active')
      this._navElement.removeAttribute('aria-current')
    }
  }
```

- [ ] **Step 5: Run the full suite**

Run: `npm run test:run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/StateMachine.tsx vanilla/StateMachine.js vanilla/StateMachine.elements.js src/StateMachine.test.tsx test/vanilla/StateMachine.test.js
git commit -m "feat: honor preventDefault in nav buttons; aria-current on active controls"
```

---

### Task 11: Real library packaging — `dist/` build, peer deps, tight `files`

Fixes FINDINGS.CODEX P0 packaging / FINDINGS.GROK P1#5. Ships compiled ESM + `.d.ts`; React becomes a peer; `gh-pages` leaves runtime deps; demo HTML leaves the tarball.

**Files:**
- Create: `tsup.config.ts`
- Modify: `package.json`
- Test: manual `npm pack --dry-run` inspection + import smoke test (also wired into CI in Task 12)

**Interfaces:**
- Produces: `dist/StateMachine.js` + `dist/StateMachine.d.ts`; npm scripts `build:lib`, `prepublishOnly`. Task 12's CI and Task 14's README installation docs depend on these paths.

- [ ] **Step 1: Install tsup**

Run: `npm install --save-dev tsup`
Expected: added to `devDependencies`, lockfile updated.

- [ ] **Step 2: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { StateMachine: 'src/StateMachine.tsx' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist-lib',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
})
```

Note `outDir: 'dist-lib'` — `dist/` is already the Vite demo output consumed by `gh-pages -d dist`; keeping them separate prevents the demo deploy from shipping (or deleting) library artifacts.

- [ ] **Step 3: Rewrite `package.json` metadata**

Apply these exact changes (leave `devDependencies` otherwise untouched):

```json
{
  "name": "ygdrassil",
  "version": "2026.2.0",
  "type": "module",
  "main": "./dist-lib/StateMachine.js",
  "types": "./dist-lib/StateMachine.d.ts",
  "exports": {
    ".": {
      "types": "./dist-lib/StateMachine.d.ts",
      "import": "./dist-lib/StateMachine.js"
    },
    "./vanilla": "./vanilla/StateMachine.js",
    "./vanilla/elements": "./vanilla/StateMachine.elements.js"
  },
  "sideEffects": [
    "./vanilla/StateMachine.elements.js"
  ],
  "files": [
    "dist-lib/",
    "vanilla/StateMachine.js",
    "vanilla/StateMachine.elements.js",
    "vanilla/README.md"
  ],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

- Delete the whole `"dependencies"` block; move `react` `^19.1.0`, `react-dom` `^19.1.0`, and `gh-pages` `^6.3.0` into `devDependencies` (demo + tests still need them locally).
- Scripts — add:

```json
    "build:lib": "tsup",
    "prepublishOnly": "npm run test:run && npm run build:lib"
```

Then run `npm install` to update the lockfile.

- [ ] **Step 4: Build and smoke-test**

Run: `npm run build:lib`
Expected: `dist-lib/StateMachine.js`, `dist-lib/StateMachine.d.ts`, sourcemaps created; no TS errors.

Run: `node -e "import('./dist-lib/StateMachine.js').then(m => { if (!m.StateMachine || !m.useStateMachine) throw new Error('missing exports'); console.log('exports ok') })"`
Expected: `exports ok`.

Run: `npm pack --dry-run`
Expected tarball contents EXACTLY: `package.json`, `README.md` (auto-included), `LICENSE` (auto-included), `dist-lib/*`, `vanilla/StateMachine.js`, `vanilla/StateMachine.elements.js`, `vanilla/README.md`. No `.tsx`, no demo HTML (`vanilla/index.html`, `elements-demo.html`, `test.html`, `elements-test.html`, `app.js`, `style.css` must be absent).

- [ ] **Step 5: Run full suite + demo build (regression)**

Run: `npm run test:run` then `npm run build`
Expected: all green. (`.gitignore` already ignores `dist`; add `dist-lib` to `.gitignore`.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsup.config.ts .gitignore
git commit -m "feat!: compiled library build, React peer deps, tight package files"
```

---

### Task 12: Lint zero-warning + GitHub Actions CI

Fixes FINDINGS.GROK P1#10 and the lint-warning normalization concern in FINDINGS.CODEX P2.

**Files:**
- Modify: `eslint.config.js`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `build:lib` script and `dist-lib/` layout from Task 11; `scripts/sync-public.mjs --check` arrives in Task 13 (CI step added there).

- [ ] **Step 1: Silence the intentional single-file co-export pattern**

`src/StateMachine.tsx` deliberately co-exports the context, hook, and components from one file (it's the whole library). Append a scoped override to `eslint.config.js` (as a new element of the `tseslint.config(...)` array, after the existing object):

```js
  {
    files: ['src/StateMachine.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
```

- [ ] **Step 2: Verify lint is clean**

Run: `npm run lint`
Expected: exit 0, **0 errors, 0 warnings**.

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
      - run: npm run build:lib
      - run: node -e "import('./dist-lib/StateMachine.js').then(m => { if (!m.StateMachine || !m.useStateMachine) throw new Error('missing exports'); })"
      - run: npm pack --dry-run
```

- [ ] **Step 4: Validate YAML locally**

Run: `npx --yes yaml-lint .github/workflows/ci.yml` (or `node -e "const fs=require('fs');require('js-yaml')"` equivalents are unavailable — a plain read-through is acceptable; the file is short). Simplest robust check: `npx --yes action-validator .github/workflows/ci.yml` if network allows; otherwise rely on the first push.
Expected: no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js .github/workflows/ci.yml
git commit -m "chore: zero-warning lint config and GitHub Actions CI"
```

---

### Task 13: `public/` vanilla copies become generated artifacts

Fixes FINDINGS.GROK P2#22 / FINDINGS.CODEX P3 (duplicate editable copies). `vanilla/` is canonical; `public/` copies are synced by script and drift-checked in CI.

**Files:**
- Create: `scripts/sync-public.mjs`
- Modify: `package.json` (scripts), `.github/workflows/ci.yml` (drift check step)

**Interfaces:**
- Consumes: CI workflow from Task 12.
- Produces: `npm run sync:public` (copy) and `node scripts/sync-public.mjs --check` (drift check, exit 1 on mismatch); `predeploy` hook.

- [ ] **Step 1: Create `scripts/sync-public.mjs`**

```js
// vanilla/ is the canonical source for the StateMachine runtime files.
// public/ carries deploy-time copies for the gh-pages demo; this script
// keeps them in sync (default) or verifies they match (--check).
import { copyFileSync, readFileSync } from 'node:fs'

const files = ['StateMachine.js', 'StateMachine.elements.js']
const check = process.argv.includes('--check')
let drift = false

for (const f of files) {
  const src = new URL(`../vanilla/${f}`, import.meta.url)
  const dest = new URL(`../public/${f}`, import.meta.url)
  if (check) {
    if (readFileSync(src, 'utf8') !== readFileSync(dest, 'utf8')) {
      console.error(`DRIFT: public/${f} does not match vanilla/${f} — run: npm run sync:public`)
      drift = true
    }
  } else {
    copyFileSync(src, dest)
    console.log(`synced vanilla/${f} -> public/${f}`)
  }
}

if (drift) process.exit(1)
if (check) console.log('public/ copies match vanilla/')
```

- [ ] **Step 2: Wire npm scripts**

In `package.json` scripts add:

```json
    "sync:public": "node scripts/sync-public.mjs",
    "predeploy": "node scripts/sync-public.mjs"
```

(`npm run deploy` auto-runs `predeploy` first.)

- [ ] **Step 3: Sync now and verify check mode**

Run: `npm run sync:public` — Tasks 3–9 changed `vanilla/*` while `public/*` stayed stale; this brings the copies current.
Run: `node scripts/sync-public.mjs --check`
Expected: `public/ copies match vanilla/`, exit 0.

- [ ] **Step 4: Add the CI drift check**

In `.github/workflows/ci.yml`, after the `npm run lint` step add:

```yaml
      - run: node scripts/sync-public.mjs --check
```

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-public.mjs package.json public/StateMachine.js public/StateMachine.elements.js .github/workflows/ci.yml
git commit -m "chore: generate public/ vanilla copies; CI drift check"
```

---

### Task 14: Documentation truth pass + demo polish

Fixes FINDINGS.GROK P1#6 (false README example), P2#23 (doc gaps), P2#24 (dead `M1` transitions), FINDINGS.CODEX P3 (`StateDefinition.element` dead weight), and documents the decisions made in Tasks 2–7.

**Files:**
- Modify: `README.md`, `vanilla/README.md`, `src/com/Docs/HookDoc.tsx`, `src/App.tsx`, `src/StateMachine.tsx` (interface cleanup)

**Interfaces:**
- Consumes: every behavior/API decision from Tasks 2–11 (repair-on-reject, `onExit` on close, initial `onEnter`, `null` transitions, boolean `gotoState`, `onTransitionDenied`, peer deps).

- [ ] **Step 1: `StateDefinition.element` becomes optional and unused**

In `src/StateMachine.tsx`, change the interface (lines 14-20):

```tsx
export interface StateDefinition {
  onEnter?: () => void
  onExit?: () => void
  transition?: string[]
}
```

and in `State`'s registration effect drop the `element` property from the definition literal (delete `element: children || <></>,`). Remove the now-unused `ReactElement` import if nothing else references it. Run `npm run test:run` + `npm run build` — green (nothing reads `element`; verified during review).

- [ ] **Step 2: Fix README.md**

Exact edits:

1. **Navigation example (lines 100-108)** — `StateButton` is a module export, not a hook property. Replace:

```jsx
import { StateMachine, State, StateButton, useStateMachine } from 'ygdrassil'

function Navigation() {
  return (
    <nav>
      <StateButton to="home">Home</StateButton>
      <StateButton to="about">About</StateButton>
    </nav>
  )
}
```

(and add `StateButton` to the import line in the example at line 82.)

2. **Hook API list (lines 54-68)** — corrections:
   - `gotoState(name, data?, replace?)` — returns `boolean` (false when the transition is denied)
   - `availableTransitions` — `string[] | null`; `null` = unrestricted (any state), `[]` = terminal (no transitions allowed)
   - `registerState(name, definition)` — definition is `{ onEnter?, onExit?, transition? }` (fix the wrong 4-argument signature)

3. **`<StateMachine>` props (lines 44-47)** — add: `onEnter` / `onExit` global hooks (they exist and are demoed but undocumented here), and `onTransitionDenied(from, to)`.

4. **New "URL & transition semantics" subsection** under Features:

```markdown
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
```

5. **Installation note** — after the npm install snippet: React 18 or 19 required as a peer dependency.

- [ ] **Step 3: Update `vanilla/README.md`**

Locate the corresponding sections and apply:
- `gotoState(...)` returns `boolean`; document `onTransitionDenied` in the constructor config table.
- `getAvailableTransitions()` returns `string[] | null` (null = unrestricted, [] = terminal).
- `setQuery` uses `history.pushState` + a synchronous `hashchange` dispatch (subscribers fire immediately).
- URL repair on rejected hash navigation (same wording as the README subsection above).
- `<state-def>`: removals unregister; `transition` attribute edits apply live. Note that `onenter`/`onexit` global-function attributes are legacy — prefer the `enter`/`exit`/`state-*` CustomEvents.

- [ ] **Step 4: Update `src/com/Docs/HookDoc.tsx`**

- `gotoState` row (lines 25-29): type `(name, data?, replace?) => boolean`, description "Navigate to a state; returns false when denied. Optional data merges query params; replace clears non-yg params first."
- (The `availableTransitions` row was already fixed in Task 5.)

- [ ] **Step 5: Wire `M1` transitions in the demo**

In `src/App.tsx` (lines 60-70) pass the graphs that `constants.ts` already defines:

```tsx
        <State name={M1.ST[0]} transition={M1.one}>
          <One />
        </State>

        <State name={M1.ST[1]} transition={M1.two}>
          <Two />
        </State>

        <State name={M1.ST[2]} transition={M1.three}>
          <Three />
        </State>
```

Demo behavior note: Machine #1's "All States" buttons can now be denied (e.g. `one → three` is not in `M1.one`) — this is intentional; it demonstrates guards plus the new URL repair. Optionally add `onTransitionDenied={(from, to) => console.warn('denied', from, to)}` to the `app` machine to surface it in the demo console.

- [ ] **Step 6: Verify + run everything**

Run: `npm run test:run && npm run lint && npm run build && npm run build:lib && node scripts/sync-public.mjs --check`
Expected: all green, no drift.

Manual smoke: `npm run dev`, click through Machine #1 (denied moves keep URL consistent), Machine #2 transitions list, Docs machine.

- [ ] **Step 7: Commit**

```bash
git add README.md vanilla/README.md src/com/Docs/HookDoc.tsx src/App.tsx src/StateMachine.tsx
git commit -m "docs: correct API docs; wire M1 demo transitions; drop dead StateDefinition.element"
```

---

## Explicitly deferred (rationale on record)

| Item | Source | Why deferred |
|------|--------|--------------|
| Query numeric coercion → strings-only or `parseNumbers` opt-in | GROK P1#12 | Tested, documented feature; changing it breaks consumers silently. Documented as a footgun in Task 14. Revisit at the next major. |
| `onenter`/`onexit` global-function attributes removal | GROK P2#14 | Back-compat; CustomEvents documented as the preferred path (Task 14). |
| Unknown-state policy (`onUnknownState` / fallback-to-initial) | CODEX P2 | Current "URL wins, undeclared renders nothing" is now documented; a fallback API is a feature decision, not a fix. |
| SSR / non-DOM guards | GROK P2#20 | SPA-only claim stands; non-goal per FINDINGS scope framing. |
| Framework-neutral shared core (vanilla core wrapped by React) | GROK P1#9 / CODEX delivery order #3 | Highest-effort refactor; parity tests from Tasks 1–10 shrink the drift risk it addresses. Reassess after this plan ships. |
| `hidden` attribute instead of `style.display`; focus management | CODEX P3 | Cosmetic; `aria-current` (Task 10) covers the high-leverage a11y gap. |
| 595 kB demo logo optimization | GROK P2#22 | Demo-only concern; no library impact. |

## Completion checklist

- [ ] All 14 tasks committed locally (do not push without the user's go-ahead)
- [ ] `npm run test:run` — expect ~110 tests, 0 failures (77 original + ~33 new; exact count depends on Task 4 reconciliation)
- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm run build` and `npm run build:lib` — both green
- [ ] `npm pack --dry-run` — no `.tsx`, no demo HTML in tarball
- [ ] `node scripts/sync-public.mjs --check` — no drift
- [ ] Version `2026.2.0` in package.json; npm publish is a separate, user-approved step
