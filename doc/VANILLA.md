# Vanilla Version

`ygdrassil` version for vanilla webapp or PWA: HTML - JS

✅ **Implementation Complete** - See `/vanilla` directory

## Overview

A vanilla JavaScript implementation of the Ygdrassil state machine that:
- Responds to hash changes in the URL
- Provides optional control of possible transitions between states (rejected
  URL-driven navigation repairs the URL back to the current state)
- Is dependent only on standard web technologies/APIs (no frameworks required)
- Works in any modern browser without build tools

## Features

- Zero dependencies - pure vanilla JavaScript
- State management via URL hash parameters
- Transition control between states; `gotoState` returns `false` when denied
  and an `onTransitionDenied(from, to)` config callback is available
- Global and state-level lifecycle hooks (onEnter, onExit), including the
  initial/deep-linked state
- Query parameter management
- Support for multiple simultaneous state machines
- Event subscription for reactive updates
- Web Components (`<state-machine>`, `<state-def>`, `<state-nav>`,
  `<state-query>`) with live state-def reconciliation
- Helper functions for creating navigation buttons and links (active controls
  carry `aria-current="page"`)

## Location

The vanilla implementation is located in the `/vanilla` directory:
- `StateMachine.js` - Core state machine implementation
- `StateMachine.elements.js` - Web Components wrapper
- `index.html` / `app.js` / `style.css` - Interactive demo application
- `elements-demo.html` - Web Components demo
- `test.html` / `elements-test.html` - Browser test pages (the automated
  suite lives in `/test/vanilla` and runs with `npm test`)
- `README.md` - Full documentation

Only `StateMachine.js`, `StateMachine.elements.js`, and `README.md` are
published to npm; the demo and test pages are repo-only.

## Usage

See `/vanilla/README.md` for complete documentation and examples.
