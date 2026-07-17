# Ygdrassil — Critical Review Findings (Grok)

**Date:** 2026-07-17  
**Reviewer:** Grok (project-level review, not a PR diff review)  
**Scope:** Full library (React `src/StateMachine.tsx`, vanilla + web components, packaging, tests, docs, demo app)  
**Framing:** Featureset is intentionally small and focused — a SPA state machine whose source of truth is the URL hash. Findings below respect that constraint: they prioritize correctness, packaging, API honesty, and maintainability over “grow into XState.”

**Verification baseline:**
- `npm run test:run` — 77/77 React tests passed
- `npm run lint` — 0 errors, 2 react-refresh warnings
- `npm run build` — succeeds (demo site)
- `npm pack --dry-run` — publishes raw `.tsx` + `vanilla/*` (~25 kB tarball)

---

## Executive summary

Ygdrassil has a clear, useful niche: **declarative UI states bound to `#?yg-<name>=...` hash params**, with optional transition guards, query bag, lifecycle hooks, and multi-machine coexistence. The React surface is well-tested; the vanilla path is a credible zero-dependency twin.

The biggest risks are not missing features. They are:

1. **URL ↔ in-memory state can desync** when a transition is rejected after the URL already changed.
2. **Lifecycle / close semantics diverge** between React and vanilla (and initial enter is incomplete).
3. **`availableTransitions` means the opposite of what the UI/docs imply** when transitions are unrestricted.
4. **npm packaging ships source TSX**, with React as a hard dependency and no peer/build story — fragile for consumers.
5. **Docs and demos have a few false claims** (e.g. `StateButton` from the hook).

None of these require expanding the product into a general-purpose FSM framework. Most are fixable within the current focused design.

---

## What works well (keep)

| Strength | Notes |
|----------|--------|
| Clear product identity | Hash-synced SPA machine; not Redux, not a router, not XState |
| Multi-machine via `yg-<name>` | Multiple independent machines in one hash is a real differentiator |
| Dual API | React components/hooks + vanilla class + web components |
| Transition guards (when used correctly) | Optional `transition[]` is simple and sufficient for wizards |
| React test suite | Broad coverage of goto, query, links, externals, multi-machine, globals |
| Demo as living docs | In-app Docs machine + gh-pages demo is appropriate for this size |
| Small intentional surface | Easy to learn; low cognitive overhead |

---

## Severity legend

- **P0** — Correctness bug users will hit; state/URL/lifecycle wrong
- **P1** — Packaging, API honesty, or parity issues that hurt real adoption
- **P2** — Quality / DX / hygiene; improve when convenient
- **P3** — Nice-to-have or explicit non-goals (do not expand scope without intent)

---

## P0 — Correctness

### 1. URL/state desync when a forbidden transition is applied via the URL

**Where:** `src/StateMachine.tsx` (`gotoState` vs `transitionToState` / hash handler); same pattern in `vanilla/StateMachine.js`.

**Behavior:**
- `gotoState` validates transitions **before** writing the hash — good.
- Hash changes (back/forward, pasted URL, `ExternalButton` / `ExternalLink`, manual `location.hash`) write the URL first, then `transitionToState` may **reject** and leave React/vanilla `currentState` unchanged while the hash still shows the forbidden target.

**Impact:** Bookmark/share URLs, browser history, and External* controls can leave the app displaying state A while the address bar says state B. Refresh then “honors” the bad URL (and may succeed if the previous state had no restriction, or fail again).

**Suggestion:**
- On reject, **rewrite the hash back** to the current state (`history.replaceState`) so URL remains source of truth.
- Or: treat URL as absolute authority and always enter the named state (document that transition lists only constrain *programmatic* `gotoState`). Pick one model and test it.

---

### 2. React `close()` / param removal skips lifecycle `onExit`

**Where:** React hash handler when `readParam()` is null — only `setCurrentState(undefined)`.  
**Contrast:** Vanilla `_handleHashChange` calls state + global `onExit` before clearing.

**Impact:** Consumers that free resources or flush drafts in `onExit` will leak / skip cleanup on React when the machine is closed or the `yg-*` param is removed. Cross-flavor parity is broken.

**Suggestion:** Mirror vanilla: if leaving a defined `currentState` because the param vanished, run state-level then global `onExit`, then clear.

---

### 3. State-level `onEnter` never runs for the initial active state

**Where:** React initial `globalOnEnter` effect; vanilla `_init` only calls `globalOnEnter`.  
State-level `onEnter` runs only on subsequent transitions.

**Impact:** “Load data when entering this state” does not run on first paint / deep link. Surprising for wizards and for URL-restored states on mount (hash already set → no transition path).

**Suggestion:** After registry is ready (or on first registration of the active state), invoke that state’s `onEnter` once. Document ordering relative to global `onEnter`. Add tests for: initial prop, deep-linked hash, and late-registered state matching current URL.

---

### 4. `availableTransitions` empty array is overloaded

**Where:** Context builder:

```ts
availableTransitions: currentState
  ? statesRef.current[currentState]?.transition ?? []
  : []
```

**Guard logic:** `if (allowed && !allowed.includes(next))` — **missing `transition` means all destinations allowed**.  
**UI/docs:** Empty array is treated as “no allowed next states” (demo `Second/Controls`, docs examples that `.map` the list).

**Impact:** Unrestricted states (Machine #1 in the demo) correctly allow any `gotoState`, but any UI built from `availableTransitions` shows **zero** nav options. The API name implies “what you can do,” not “what was declared.”

**Suggestion (pick one, document hard):**
- **A (recommended):** `undefined` / omit = open graph; expose `availableTransitions: string[] | null` (null = unrestricted) or a separate `isRestricted` flag; empty array = truly terminal.
- **B:** Default `transition` to all registered state names when omitted (auto-complete open graph into a concrete list).

Until then, docs should not claim empty means “none.”

---

## P1 — Packaging, API honesty, parity

### 5. npm package is not a real library build

**Evidence (`npm pack --dry-run`):** publishes `src/StateMachine.tsx` as `main`/`types`/`exports["."]`, plus `vanilla/`.

**Problems:**
- Consumers must transpile **TSX** from `node_modules` (many setups disallow this).
- No emitted `.d.ts` via `tsc` (types point at source; works only under permissive TS configs).
- No dual ESM/CJS, no `sideEffects`, no minified browser bundle for React.
- `react` / `react-dom` are **dependencies**, not **peerDependencies** — risk of duplicate React and forced React 19.
- `gh-pages` is a **runtime dependency** of the published package (deploy tool for the demo site).
- Demo app and library share one package.json / Vite app layout (`noEmit: true`, path alias `@/*`) — library packaging was never separated from the playground.

**Suggestion:**
- `peerDependencies`: `react`, `react-dom` (range e.g. `^18 || ^19`).
- Move `gh-pages` (and ideally Vite demo deps) out of published `dependencies`.
- Add a small library build (`tsup` / `unbuild` / dual Vite lib mode) emitting `dist/index.js` + `dist/index.d.ts` (+ vanilla already JS).
- Keep `files` whitelist tight; exclude demo HTML from the package if not needed on npm (or keep only `vanilla/StateMachine*.js` + README).

---

### 6. README example is wrong

```jsx
const { StateButton } = useStateMachine() // StateButton is NOT on the context
```

`StateButton` is a separate export. In-repo demo imports it correctly; root README does not.

**Suggestion:** Fix README; align with `HookDoc` / demo.

---

### 7. External navigation bypasses transition checks (by construction)

`ExternalButton` / `ExternalLink` mutate the hash without consulting the target machine’s transition table. Combined with P0#1, this is the main programmatic path to desync (and the demo promotes External* for multi-machine).

**Suggestion:** Either document “External* is unconstrained URL write,” or resolve the target machine registry (hard from outside React tree) / always roll back forbidden URL changes in the listener.

---

### 8. History API inconsistency

| API | Mechanism |
|-----|-----------|
| `gotoState` / `close` / ExternalButton | `history.pushState` + synthetic `HashChangeEvent` |
| `setQuery` | `window.location.hash = ...` (native hashchange + different history semantics) |

**Impact:** Back-stack shape and event ordering differ between “change state” and “change query,” complicating debugging and testing.

**Suggestion:** One write path for the hash (prefer `pushState`/`replaceState` + single notify helper). Offer `replace` consistently for query-only updates if you want to avoid history spam.

---

### 9. React vs vanilla behavioral drift (maintainability)

Duplicated logic lives in three places: `src/StateMachine.tsx`, `vanilla/StateMachine.js`, `public/StateMachine.js` (copy for gh-pages). Already diverging on close/onExit (P0#2). Web components sit on vanilla only.

**Suggestion:** Treat `vanilla/StateMachine.js` as the single hash/transition core (or a tiny shared pure module), wrap React around it; copy to `public/` in deploy script or import from one path. Add a short parity checklist test (even manual) for: initial enter, close exits, reject rewrite, setQuery history.

---

### 10. No CI

No `.github/workflows`. Tests exist but do not gate merges.

**Suggestion:** Minimal workflow: `npm ci`, `test:run`, `lint`, `build` on PR/push to main.

---

### 11. Vanilla / web components lack automated tests in Vitest

`vanilla/test.html` and `elements-test.html` are browser-manual. Regressions in vanilla will not fail `npm test`.

**Suggestion:** A few node/jsdom tests importing `vanilla/StateMachine.js` (hash mocking) would close the largest coverage hole without expanding scope.

---

### 12. Query value type coercion is lossy

`Number(v)` when not `NaN` turns query values into numbers. Side effects:
- Leading zeros dropped (`"001"` → `1`)
- Large integer IDs may lose precision
- `" "` / edge strings behave oddly; booleans never coerced

This is tested as a feature, but it is a footgun for IDs and codes.

**Suggestion:** Default to **strings only** (URL-native), or opt-in `parseNumbers`. Document strongly if keeping current behavior.

---

## P2 — Quality, DX, security hygiene

### 13. Web component `state-query` XSS surface

`state-query` builds HTML via string interpolation of query keys/values (`innerHTML`). Query strings are user-controlled (URL).

**Suggestion:** `textContent` / `createElement` only; never interpolate raw query into HTML.

### 14. Web component lifecycle hooks via `window[onenterAttr]`

`onenter` / `onexit` attributes resolve global function names. Fine for tiny demos; brittle and easy to misuse. Prefer `CustomEvent` only (already dispatched) and document that.

### 15. `state-def` registration is one-shot

`_discoverStates` skips names already in the map — attribute updates to `transition` after first discovery are ignored. MutationObserver does not refresh definitions.

### 16. `state-nav` always `preventDefault`s

Link-type nav never does a full hash navigation from the click; it always goes through `gotoState`. Middle-click / open-in-new-tab still use `href` (good), but click path diverges from native link behavior and still subject to P0#1 if guards differ.

### 17. Failed transitions only `console.warn`

No return value, no event, no error channel. Apps cannot show “can’t go there” without reimplementing the guard.

**Suggestion (minimal):** `gotoState` returns `boolean`; optional `onTransitionDenied` callback.

### 18. Goto undeclared state is allowed

Demo explicitly has “Undeclared State Flarn.” URL updates; no matching `<State>` → blank content; no hard error. Acceptable for a flexible machine, but should be documented (and maybe a dev-only warning when name ∉ registry).

### 19. Machine with no `currentState` renders **nothing** (including chrome)

When closed or not yet started, React `StateMachine` returns `null` children entirely. That matches “unload,” but it also means in-machine nav/controls disappear with the machine — External* must live outside. Document this lifecycle model.

### 20. No SSR / non-DOM guards

Direct `window` / `location` use — fine for SPA-only claim; will throw under SSR frameworks. Optional `typeof window !== 'undefined'` or lazy subscribe would help Next/Remix embedders even if SSR state is “inactive.”

### 21. Accessibility gaps (small, high leverage)

`StateButton` / `StateLink` only add CSS class `active`. Prefer `aria-current="page"` (or `true`) on the active control for a11y without new features.

### 22. Demo / packaging hygiene

- Built logo asset ~595 kB in `dist` — heavy for a docs demo.
- `public/` copies of vanilla sources can drift from `vanilla/`.
- ESLint react-refresh warnings on context+hook co-export — expected for a single-file library; ignore or split files.
- Production `npm audit` flagged transitive high via dep tree (notably with `gh-pages` in dependencies) — cleaning deps helps.

### 23. Docs surface incompleteness

- `HookDoc` shows `gotoState(name)` only; omits `data` / `replace`.
- Root README lists `registerState` / `unregisterState` on the hook; advanced, lightly documented, easy to break invariants (unregister active state, etc.).
- `doc/VANILLA.md` is a stub pointing at `/vanilla`; fine, but easy to confuse with published API docs.

### 24. Machine #1 transition tables unused

`M1` in `constants.ts` defines transition graphs, but `App.tsx` First machine `<State>`s do not pass `transition={...}`. Only Machine #2 / docs use restrictions. Not a bug, but the constant graph is dead code / misleading for readers learning from the demo.

---

## P3 — Explicit non-goals (do not treat as gaps unless product direction changes)

These are common state-machine / router features **intentionally outside** a small hash-FSM. Listed only so they are not mistaken for accidental omissions:

- Hierarchical / parallel regions, guards with context, delayed transitions, SCXML
- Pathname History API routing (`/app/step` instead of `#?yg-...`)
- Code-splitting per state, view transitions API
- Persistence beyond URL (sessionStorage sync)
- Formal visualizer / XState interop
- React Native / non-browser targets

If any of these become goals, they should be separate design docs — not silent creep into `StateMachine.tsx`.

---

## Suggested improvement backlog (focused)

Ordered for impact vs scope discipline:

| Priority | Item | Effort |
|----------|------|--------|
| P0 | On rejected transition, `replaceState` URL back to current (or document alternate model) | S |
| P0 | React close/param-clear runs `onExit` (match vanilla) | S |
| P0 | Fire state-level `onEnter` for initial / deep-linked state | M |
| P0 | Fix `availableTransitions` semantics + docs/demo | S–M |
| P1 | Fix README `useStateMachine` example | S |
| P1 | peerDeps for React; move `gh-pages` to devDeps | S |
| P1 | Library build + proper `exports` / types | M |
| P1 | Single hash-write helper; align `setQuery` | S |
| P1 | Vitest coverage for vanilla core | M |
| P1 | GitHub Actions CI | S |
| P2 | Escape `state-query` HTML | S |
| P2 | `gotoState` → `boolean`; denied callback | S |
| P2 | `aria-current` on active nav | S |
| P2 | Deploy script: one vanilla source → public | S |
| P2 | Wire or delete unused `M1` transitions in demo | S |

---

## Architecture sketch (current)

```text
URL hash:  #?yg-<machine>=<state>&<query...>
              │
              ▼
     hashchange listener  ◄── pushState + synthetic event (goto/close/external)
              │
     transition guard (optional list on previous state)
              │
     onExit(prev) → onEnter(next) → global onExit/onEnter
              │
     React: context + conditional <State> children
     Vanilla: listeners + caller-driven DOM
     Elements: display:none / active attribute on <state-def>
```

**Design tension:** “URL is source of truth” vs “transition table can veto.” The library currently implements **both** without a reconciliation step — that tension is the root of P0#1.

---

## Verdict

Ygdrassil is a coherent, small library with a sharp idea and a surprisingly complete React test harness. It does not need a larger featureset to be valuable.

It **does** need a short correctness pass (URL reconciliation, lifecycle parity, transition list semantics) and a **library packaging pass** before it is comfortable as an npm dependency for third parties. With those, the intentionally minimal SPA state-machine positioning is solid.

---

## Appendix — Files reviewed (primary)

- `src/StateMachine.tsx` — core React implementation
- `src/StateMachine.test.tsx` — React tests (77)
- `vanilla/StateMachine.js`, `vanilla/StateMachine.elements.js`
- `public/StateMachine.js`, `public/StateMachine.elements.js` (deploy copies)
- `package.json`, `vite.config.ts`, `vitest.config.ts`, tsconfigs
- `README.md`, `doc/VANILLA.md`, `vanilla/README.md`
- Demo: `src/App.tsx`, `src/com/**`, docs components

## Appendix — Commands run

```text
npm install
npm run test:run   # 77 passed
npm run lint       # 2 warnings
npm run build      # ok
npm pack --dry-run
npm audit --omit=dev
```
