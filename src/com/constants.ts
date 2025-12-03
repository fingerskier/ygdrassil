export const M1 = {
  ST: [ 'one', 'two', 'three' ],
  one: [ 'two' ],
  two: [ 'one', 'three' ],
  three: [ 'one' ],
}

export const M2 = {
  ST: [ 'alpha', 'beta', 'gamma', 'delta' ],
  alpha: [ 'beta' ],
  beta: [ 'alpha', 'gamma' ],
  gamma: [ 'beta', 'delta' ],
  delta: [ 'gamma', 'alpha' ],
}

export const DOCS = {
  ST: [ 'overview', 'statemachine', 'state', 'navigation', 'hook', 'examples', 'api' ],
  overview: [ 'statemachine', 'examples' ],
  statemachine: [ 'overview', 'state', 'navigation' ],
  state: [ 'statemachine', 'navigation', 'hook' ],
  navigation: [ 'state', 'hook', 'examples' ],
  hook: [ 'state', 'navigation', 'api' ],
  examples: [ 'overview', 'navigation', 'api' ],
  api: [ 'hook', 'examples', 'overview' ],
}