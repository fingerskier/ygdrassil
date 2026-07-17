import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { StateMachine: 'src/StateMachine.tsx' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist-lib',
  tsconfig: 'tsconfig.lib.json',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
})
