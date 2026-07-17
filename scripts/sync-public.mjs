// vanilla/ is the canonical source for the StateMachine runtime files.
// public/ carries copies for the Vite demo (GitHub Pages); this script
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
