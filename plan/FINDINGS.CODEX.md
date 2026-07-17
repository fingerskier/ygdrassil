# Critical review: Ygdrassil

**Review scope.** This review evaluated the published React API, the vanilla
JavaScript API and custom elements, packaging, tests, and the SPA build. The
small, URL-backed state-machine scope is appropriate; the recommendations below
focus on making that narrow contract dependable rather than adding a router or a
large feature set.

## Executive summary

The project has a clear core idea and a healthy React unit-test suite, but its
current URL synchronization has correctness failures at the boundary where it
matters most: browser history, deep links, and rejected transitions. The npm
package is also not consumable as a conventional JavaScript library because its
React entry point is uncompiled TSX. The vanilla and Web Components surfaces
receive no automated coverage despite being documented and published.

The first release-quality milestone should be: define a single transition
transaction, use it for programmatic navigation and browser-driven navigation,
and test it across React and vanilla. Package compiled ESM plus declarations
and then make the demo files derive from those canonical build artifacts.

## Findings

### P0 — rejected navigation leaves the URL and active state inconsistent

**Evidence.** The programmatic `gotoState` methods correctly check the current
state's transition list before writing the hash ([React
`gotoState`](../src/StateMachine.tsx#L177-L220); [vanilla
`gotoState`](../vanilla/StateMachine.js#L249-L264)). The browser-driven path
does not have that opportunity: address-bar edits, Back/Forward, and ordinary
`<StateLink>` navigation change the hash before the handler runs. When the
handler rejects that URL state, it only warns and retains the prior active state
([React handler](../src/StateMachine.tsx#L156-L175); [vanilla
handler](../vanilla/StateMachine.js#L188-L219)); neither implementation
restores the prior canonical hash.

**Impact.** A user can be shown state `A` while the URL says state `B`.
Refreshing subsequently activates `B`; copied links are misleading; and Back
can appear to do nothing. This defeats the primary bookmarkable-state promise.

**Recommendation.** Centralize validation and commit into one transition
function that returns a result such as `{ accepted, from, to, reason }`. Retain
the existing pre-write validation in `gotoState`. For a rejected
browser-originated navigation, either restore the prior canonical hash with
`history.replaceState` or explicitly adopt a documented permissive URL policy.
Repairing the URL must not add another history entry. Add regression tests for
button, link, address-bar, Back, and Forward rejection paths in both APIs.

### P0 — the published React package exports source TSX instead of a runtime build

**Evidence.** `package.json` points `main`, `types`, and the root export at
`src/StateMachine.tsx` ([package.json](../package.json#L5-L10)), while `build`
uses `tsc` only for type checking (`noEmit`) and Vite only to build the demo
([tsconfig.app.json](../tsconfig.app.json#L18-L19); [package.json](../package.json#L18-L22)). `npm pack --dry-run` confirms the tarball contains the TSX source but
no compiled React module or `.d.ts` file.

**Impact.** Direct Node/bundler consumers cannot reliably load the package's
declared entry point, and TypeScript consumers have no emitted declaration file.
This is a release-blocking distribution concern, independent of the application
demo building successfully.

**Recommendation.** Add a library build (for example, Vite library mode or
`tsup`) that emits ESM JavaScript and `.d.ts` declarations into `dist/`. Map
`exports` with `import`, `types`, and the vanilla subpaths to those artifacts.
Declare `react` and `react-dom` as peer dependencies (with development copies
for tests/demo), and add a packed-tarball consumer smoke test to CI.

### P1 — lifecycle semantics differ by entry path and miss state-level initial entry

**Evidence.** React invokes only the global initial `onEnter` effect
([src/StateMachine.tsx](../src/StateMachine.tsx#L281-L289)); a `<State>`
registers its `onEnter` later in an effect ([src/StateMachine.tsx](../src/StateMachine.tsx#L66-L85)), so its state-level hook is not called for the initial
or URL-selected state. The vanilla constructor calls global `onEnter` only when
it writes a configured initial state, not when it adopts an existing URL state
([vanilla/StateMachine.js](../vanilla/StateMachine.js#L55-L73)). React also
clears a removed URL state without calling either exit hook
([src/StateMachine.tsx](../src/StateMachine.tsx#L292-L306)), unlike vanilla.

**Impact.** Data loading, cleanup, analytics, and custom-element behavior can
change merely because a user refreshed a deep link, mounted a component in a
different order, or closed a machine. This makes lifecycle callbacks unsafe as
the documented state-entry mechanism.

**Recommendation.** Specify lifecycle timing as part of the public contract:
which hooks run on startup, deep-link hydration, close, registration after
activation, same-state query updates, and destroy. Implement that contract via
the shared transition transaction, invoking state and global hooks in a stable,
tested order. Consider passing a transition context (`from`, `to`, `source`,
`query`) to remove the need for consumers to read mutable global state.

### P1 — query ownership is global, so multiple machines can overwrite each other's data

**Evidence.** Each React machine exposes the entire parsed hash as `query`
([src/StateMachine.tsx](../src/StateMachine.tsx#L115-L127)) and `setQuery`
rebuilds the hash from that component's possibly stale React state
([src/StateMachine.tsx](../src/StateMachine.tsx#L236-L260)). Every machine also
handles the same `hashchange` event and updates independently
([src/StateMachine.tsx](../src/StateMachine.tsx#L292-L306)). The README promises
multiple independent machines, but its query API has no namespace or ownership
model ([README.md](../README.md#L26-L34)).

**Impact.** Two mounted machines can race: a call to `setQuery` from one can
write a snapshot that drops a just-added parameter from another. It is also
unclear which machine owns ordinary keys, and `replace` removes every ordinary
key rather than only the caller's keys.

**Recommendation.** Read the live hash immediately before every write, define
machine-scoped query keys (or make query a single shared URL-store API), and
use explicit history semantics. Add tests with two machines performing
interleaved `gotoState`/`setQuery` calls, including `replace` and back/forward.

### P1 — Web Components render URL values with `innerHTML` (DOM XSS)

**Evidence.** `<state-query>` inserts JSON and list values into `innerHTML`
without escaping ([vanilla/StateMachine.elements.js](../vanilla/StateMachine.elements.js#L435-L451)). Query values are user-controlled through the URL.

**Impact.** A crafted bookmark can inject markup or executable event-handler
attributes into an application that uses `<state-query>`. This is especially
problematic for a library whose core feature encourages sharing URLs.

**Recommendation.** Build the `pre`, `ul`, `li`, and `strong` nodes with DOM
methods and set `textContent`; never interpolate URL-derived values into HTML.
Add a test with HTML-bearing keys and values and assert that they render as text
rather than creating elements or firing handlers.

### P1 — Web Component state discovery does not track removals or definition changes

**Evidence.** The mutation observer always calls `_discoverStates`, which only
adds names absent from `_states` ([vanilla/StateMachine.elements.js](../vanilla/StateMachine.elements.js#L99-L103), [L121-L155](../vanilla/StateMachine.elements.js#L121-L155)). It never unregisters a removed `<state-def>`, and `StateDefElement` observes only
`active`, not `name` or `transition` ([vanilla/StateMachine.elements.js](../vanilla/StateMachine.elements.js#L212-L236)).

**Impact.** Dynamic SPA content leaves ghost transitions and callbacks behind;
editing a state definition is silently ignored. The rendered DOM and the
machine registry can diverge.

**Recommendation.** Reconcile the registry on every relevant mutation: build a
current definition map, unregister missing names, update changed definitions,
and observe attributes. Batch mutation handling to a microtask to avoid repeated
reconciliation. Add lifecycle tests for insertion, removal, rename, and
transition-attribute changes.

### P2 — navigation components do not honor prevented click events

**Evidence.** `StateButton` and `ExternalButton` invoke `onClick` then always
navigate ([src/StateMachine.tsx](../src/StateMachine.tsx#L352-L397)). There is no
check of `event.defaultPrevented`; the links rely on normal browser hash
navigation rather than an explicit transition call ([src/StateMachine.tsx](../src/StateMachine.tsx#L408-L443)).

**Impact.** Consumers cannot use ordinary React cancellation—for confirmation,
validation, or modifier-key handling—to stop a button transition. Buttons and
links have subtly different timing and history behavior.

**Recommendation.** After the consumer handler, return if
`event.defaultPrevented`. For same-tab links, intercept only unmodified primary
clicks and call the same navigation function as buttons; preserve normal browser
behavior for modified clicks and explicit targets. Test cancellation and
modified-click behavior.

### P2 — state and URL inputs are accepted without an explicit validity policy

**Evidence.** Both implementations transition to a state even when there is no
registered target definition (the next hook lookup is optional) ([React
transition](../src/StateMachine.tsx#L165-L171); [vanilla transition](../vanilla/StateMachine.js#L202-L217)). State and machine names are also inserted directly into
hash parameter names ([src/StateMachine.tsx](../src/StateMachine.tsx#L105-L113)).

**Impact.** Typos and stale bookmarks can yield a blank React view or a machine
state with no definition. Consumers have no supported 404/fallback path, and
the public URL format has no documented name grammar.

**Recommendation.** Choose and document one policy: reject unknown states and
fall back to `initial`, or support an explicit `onUnknownState` handler. Validate
names at registration and creation, reserve the `yg-` namespace, and surface
structured transition results instead of only `console.warn`.

### P2 — quality gates cover only React and have known lint warnings

**Evidence.** Vitest includes only `src/**/*.{test,spec}.{ts,tsx}`
([vitest.config.ts](../vitest.config.ts#L11-L12)); no vanilla or custom-element
tests are run by `npm test`. The React test file has 77 tests, but the released
vanilla surfaces have browser-only HTML test pages rather than automated CI
coverage. `npm run lint` completes with two `react-refresh/only-export-components`
warnings for the mixed context/hook/component module.

**Impact.** The most divergent published implementation can regress unnoticed,
and a warning-producing lint command makes it easier to normalize future
warnings.

**Recommendation.** Add jsdom tests for the vanilla class and elements (or a
small browser integration suite), exercising the shared behavior matrix. Make
lint clean by moving context/hooks to a dedicated module or intentionally
configuring the rule. Add CI for lint, unit tests, build, package smoke test,
and an audit/Dependabot policy.

### P3 — maintainability and accessibility improvements

* `StateDefinition.element` is registered but never read ([src/StateMachine.tsx](../src/StateMachine.tsx#L14-L20), [L69-L76](../src/StateMachine.tsx#L69-L76)). Remove it or use it as part of a deliberate rendering model; carrying stale JSX in a ref is misleading.
* `public/StateMachine*.js` duplicates the files in `vanilla/`. They currently
  have identical checksums, but two editable copies invite release drift.
  Generate/copy the deploy files as part of the build instead.
* `StateDefElement` toggles `style.display` directly
  ([vanilla/StateMachine.elements.js](../vanilla/StateMachine.elements.js#L158-L169), [L221-L235](../vanilla/StateMachine.elements.js#L221-L235)). Prefer the `hidden` property/attribute and document focus management; when a
  state changes, move focus to a predictable landmark and expose navigation
  semantics (`aria-current` for active links).
* The documented API includes `className` on `<StateMachine>` but renders no
  wrapper at all when it is absent ([src/StateMachine.tsx](../src/StateMachine.tsx#L332-L341)). Document that distinction or always render a predictable container if
  consumers need stable layout/landmarks.

## Suggested delivery order

1. **Correctness/security:** fix the rejected-URL transaction, lifecycle
   contract, and `<state-query>` DOM XSS; add regression tests.
2. **Distribution:** introduce a library build, type declarations, peer
   dependencies, and an install-from-tarball smoke test.
3. **Consistency:** share URL parsing/transition rules between React and
   vanilla (a framework-neutral core is sufficient); define unknown-state and
   query ownership policies.
4. **Hardening:** reconcile dynamic custom elements, add vanilla/elements test
   coverage, improve navigation cancellation/accessibility, and make lint clean.

## Checks performed

* `npm run lint` — completed with two warnings and no errors.
* `npm run test:run` — 77 React tests passed.
* `npm run build` — type check and Vite demo build passed.
* `npm pack --dry-run` — inspected the package artifact list.
* SHA-256 comparison of the vanilla source and `public/` duplicates — both
  duplicate pairs matched at review time.
