import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import {
  StateMachine,
  State,
  StateButton,
  StateLink,
  ExternalButton,
  ExternalLink,
  useStateMachine,
} from './StateMachine'

// Helper to dispatch hash change event
const dispatchHashChange = () => {
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

// Helper to set hash and trigger update
const setHash = (hash: string) => {
  window.location.hash = hash
  dispatchHashChange()
}

describe('StateMachine', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  describe('useStateMachine hook', () => {
    it('throws error when used outside StateMachine provider', () => {
      const TestComponent = () => {
        useStateMachine()
        return null
      }

      expect(() => render(<TestComponent />)).toThrow(
        'useStateMachine must be used inside <StateMachine>'
      )
    })

    it('returns context value when used inside StateMachine', () => {
      let ctx: ReturnType<typeof useStateMachine> | null = null

      const TestComponent = () => {
        ctx = useStateMachine()
        return null
      }

      render(
        <StateMachine initial="test">
          <State name="test"><div>Test</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(ctx).not.toBeNull()
      expect(ctx!.currentState).toBe('test')
      expect(typeof ctx!.gotoState).toBe('function')
      expect(typeof ctx!.close).toBe('function')
      expect(typeof ctx!.is).toBe('function')
      expect(typeof ctx!.setQuery).toBe('function')
      expect(ctx!.query).toBeDefined()
      expect(ctx!.availableTransitions).toBeDefined()
      expect(ctx!.param).toContain('yg-')
    })
  })

  describe('StateMachine provider', () => {
    it('renders children when initial state is set', () => {
      render(
        <StateMachine initial="home">
          <State name="home"><div data-testid="home">Home Page</div></State>
        </StateMachine>
      )

      expect(screen.getByTestId('home')).toBeInTheDocument()
    })

    it('does not render when no initial state and no hash', () => {
      render(
        <StateMachine>
          <State name="home"><div data-testid="home">Home Page</div></State>
        </StateMachine>
      )

      expect(screen.queryByTestId('home')).not.toBeInTheDocument()
    })

    it('applies className when provided and state is active', () => {
      const { container } = render(
        <StateMachine initial="test" className="test-class">
          <State name="test"><div>Test</div></State>
        </StateMachine>
      )

      expect(container.querySelector('.test-class')).toBeInTheDocument()
    })

    it('uses machine name for param', () => {
      let param: string = ''

      const TestComponent = () => {
        const ctx = useStateMachine()
        param = ctx.param
        return null
      }

      render(
        <StateMachine initial="test" name="myMachine">
          <State name="test"><div>Test</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(param).toBe('yg-myMachine')
    })

    it('uses default param when no name provided', () => {
      let param: string = ''

      const TestComponent = () => {
        const ctx = useStateMachine()
        param = ctx.param
        return null
      }

      render(
        <StateMachine initial="test">
          <State name="test"><div>Test</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(param).toBe('yg-#')
    })

    it('syncs state from URL hash on mount', () => {
      setHash('#?yg-test=page2')

      render(
        <StateMachine name="test" initial="page1">
          <State name="page1"><div data-testid="page1">Page 1</div></State>
          <State name="page2"><div data-testid="page2">Page 2</div></State>
        </StateMachine>
      )

      expect(screen.queryByTestId('page1')).not.toBeInTheDocument()
      expect(screen.getByTestId('page2')).toBeInTheDocument()
    })

    it('updates URL hash when initial state is set', async () => {
      render(
        <StateMachine initial="home" name="app">
          <State name="home"><div>Home</div></State>
        </StateMachine>
      )

      await waitFor(() => {
        expect(window.location.hash).toContain('yg-app=home')
      })
    })
  })

  describe('State component', () => {
    it('renders only when current state matches', () => {
      render(
        <StateMachine initial="active">
          <State name="active"><div data-testid="active">Active State</div></State>
          <State name="inactive"><div data-testid="inactive">Inactive State</div></State>
        </StateMachine>
      )

      expect(screen.getByTestId('active')).toBeInTheDocument()
      expect(screen.queryByTestId('inactive')).not.toBeInTheDocument()
    })

    it('calls onEnter when state becomes active', async () => {
      const onEnter = vi.fn()

      const TestComponent = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => gotoState('page2')}>Go to Page 2</button>
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2" onEnter={onEnter}><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      const button = screen.getByText('Go to Page 2')
      await act(async () => {
        fireEvent.click(button)
      })

      expect(onEnter).toHaveBeenCalledTimes(1)
    })

    it('calls onExit when leaving a state', async () => {
      const onExit = vi.fn()

      const TestComponent = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => gotoState('page2')}>Go to Page 2</button>
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" onExit={onExit}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      const button = screen.getByText('Go to Page 2')
      await act(async () => {
        fireEvent.click(button)
      })

      expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('respects transition restrictions', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const TestComponent = () => {
        const { gotoState, currentState } = useStateMachine()
        return (
          <>
            <span data-testid="current">{currentState}</span>
            <button onClick={() => gotoState('page3')}>Go to Page 3</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={['page2']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <State name="page3"><div>Page 3</div></State>
          <TestComponent />
        </StateMachine>
      )

      const button = screen.getByText('Go to Page 3')
      await act(async () => {
        fireEvent.click(button)
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Transition from "page1" to "page3" not allowed')
      )
      expect(screen.getByTestId('current').textContent).toBe('page1')

      consoleWarn.mockRestore()
    })

    it('allows transitions when in allowed list', async () => {
      const TestComponent = () => {
        const { gotoState, currentState } = useStateMachine()
        return (
          <>
            <span data-testid="current">{currentState}</span>
            <button onClick={() => gotoState('page2')}>Go to Page 2</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={['page2']}>
            <div>
              Page 1
              <TestComponent />
            </div>
          </State>
          <State name="page2">
            <div>
              Page 2
              <TestComponent />
            </div>
          </State>
        </StateMachine>
      )

      const button = screen.getByText('Go to Page 2')
      await act(async () => {
        fireEvent.click(button)
      })

      expect(screen.getByTestId('current').textContent).toBe('page2')
    })
  })

  describe('gotoState', () => {
    it('transitions to new state', async () => {
      const TestComponent = () => {
        const { gotoState, currentState } = useStateMachine()
        return (
          <>
            <span data-testid="current">{currentState}</span>
            <button onClick={() => gotoState('page2')}>Go</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Go'))
      })

      expect(screen.getByTestId('current').textContent).toBe('page2')
    })

    it('passes data to URL query params', async () => {
      const TestComponent = () => {
        const { gotoState, query } = useStateMachine()
        return (
          <>
            <span data-testid="count">{query.count ?? 'none'}</span>
            <button onClick={() => gotoState('page2', { count: 42 })}>Go</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Go'))
      })

      await waitFor(() => {
        expect(window.location.hash).toContain('count=42')
      })
    })

    it('replaces non-yg params when replace is true', async () => {
      setHash('#?yg-test=page1&foo=bar&baz=qux')

      const TestComponent = () => {
        const { gotoState, query } = useStateMachine()
        return (
          <>
            <span data-testid="foo">{query.foo ?? 'none'}</span>
            <button onClick={() => gotoState('page2', { newKey: 'value' }, true)}>Go</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Go'))
      })

      await waitFor(() => {
        expect(window.location.hash).toContain('newKey=value')
        expect(window.location.hash).not.toContain('foo=bar')
      })
    })

    it('does nothing when transitioning to same state without data', async () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState')

      const TestComponent = () => {
        const { gotoState } = useStateMachine()
        return <button onClick={() => gotoState('page1')}>Go</button>
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      const callsBefore = pushStateSpy.mock.calls.length

      await act(async () => {
        fireEvent.click(screen.getByText('Go'))
      })

      // Should not have called pushState again
      expect(pushStateSpy.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('close', () => {
    it('removes state machine param from URL', async () => {
      const TestComponent = () => {
        const { close, currentState } = useStateMachine()
        return (
          <>
            <span data-testid="current">{currentState ?? 'none'}</span>
            <button onClick={close}>Close</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Close'))
      })

      expect(window.location.hash).not.toContain('yg-test')
    })
  })

  describe('is function', () => {
    it('returns true when current state matches', () => {
      let isPage1: boolean = false

      const TestComponent = () => {
        const { is } = useStateMachine()
        isPage1 = is('page1')
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(isPage1).toBe(true)
    })

    it('returns false when current state does not match', () => {
      let isPage2: boolean = true

      const TestComponent = () => {
        const { is } = useStateMachine()
        isPage2 = is('page2')
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(isPage2).toBe(false)
    })
  })

  describe('availableTransitions', () => {
    it('returns empty array when no transitions defined', () => {
      let transitions: string[] = ['should be empty']

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

      expect(transitions).toEqual([])
    })

    it('returns defined transitions for current state', () => {
      let transitions: string[] = []

      const TestComponent = () => {
        const { availableTransitions } = useStateMachine()
        transitions = availableTransitions
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1" transition={['page2', 'page3']}><div>Page 1</div></State>
          <State name="page2"><div>Page 2</div></State>
          <State name="page3"><div>Page 3</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(transitions).toEqual(['page2', 'page3'])
    })
  })

  describe('query and setQuery', () => {
    it('reads query params from URL', () => {
      setHash('#?yg-test=page1&count=5&name=test')

      let query: Record<string, string | number> = {}

      const TestComponent = () => {
        const ctx = useStateMachine()
        query = ctx.query
        return null
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      expect(query.count).toBe(5)
      expect(query.name).toBe('test')
    })

    it('sets query params', async () => {
      const TestComponent = () => {
        const { setQuery, query } = useStateMachine()
        return (
          <>
            <span data-testid="count">{query.count ?? 'none'}</span>
            <button onClick={() => setQuery({ count: 10 })}>Set Count</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Set Count'))
      })

      await waitFor(() => {
        expect(window.location.hash).toContain('count=10')
      })
    })

    it('removes query param when set to null', async () => {
      setHash('#?yg-test=page1&toRemove=value')

      const TestComponent = () => {
        const { setQuery } = useStateMachine()
        return <button onClick={() => setQuery({ toRemove: null })}>Remove</button>
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Remove'))
      })

      await waitFor(() => {
        expect(window.location.hash).not.toContain('toRemove')
      })
    })

    it('replaces non-yg params when replace is true', async () => {
      setHash('#?yg-test=page1&foo=bar&baz=qux')

      const TestComponent = () => {
        const { setQuery, query } = useStateMachine()
        return (
          <>
            <span data-testid="foo">{query.foo ?? 'gone'}</span>
            <button onClick={() => setQuery({ newKey: 'value' }, true)}>Replace</button>
          </>
        )
      }

      render(
        <StateMachine initial="page1" name="test">
          <State name="page1"><div>Page 1</div></State>
          <TestComponent />
        </StateMachine>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Replace'))
      })

      await waitFor(() => {
        expect(window.location.hash).toContain('newKey=value')
        expect(window.location.hash).not.toContain('foo=bar')
        // yg- params should be preserved
        expect(window.location.hash).toContain('yg-test=page1')
      })
    })
  })
})

describe('StateButton', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('renders with default children as state name', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2" />
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveTextContent('page2')
  })

  it('renders custom children', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2">Go to Page 2</StateButton>
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveTextContent('Go to Page 2')
  })

  it('adds active class when on target state', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <StateButton to="page1" className="btn" />
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveClass('btn', 'active')
  })

  it('does not add active class when not on target state', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2" className="btn" />
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveClass('btn')
    expect(screen.getByRole('button')).not.toHaveClass('active')
  })

  it('transitions to target state on click', async () => {
    const TestComponent = () => {
      const { currentState } = useStateMachine()
      return <span data-testid="current">{currentState}</span>
    }

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2">Go</StateButton>
        <TestComponent />
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    expect(screen.getByTestId('current').textContent).toBe('page2')
  })

  it('passes data to gotoState', async () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2" data={{ count: 99 }}>Go</StateButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    await waitFor(() => {
      expect(window.location.hash).toContain('count=99')
    })
  })

  it('passes replace flag to gotoState', async () => {
    setHash('#?yg-test=page1&existing=value')

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2" data={{ new: 'val' }} replace>Go</StateButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    await waitFor(() => {
      expect(window.location.hash).toContain('new=val')
      expect(window.location.hash).not.toContain('existing=value')
    })
  })

  it('calls onClick handler when provided', async () => {
    const onClick = vi.fn()

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateButton to="page2" onClick={onClick}>Go</StateButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes through additional button props', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <StateButton to="page1" disabled data-testid="my-btn" />
      </StateMachine>
    )

    const button = screen.getByTestId('my-btn')
    expect(button).toBeDisabled()
  })
})

describe('StateLink', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('renders with default children as state name', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveTextContent('page2')
  })

  it('renders custom children', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2">Go to Page 2</StateLink>
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveTextContent('Go to Page 2')
  })

  it('adds active class when on target state', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <StateLink to="page1" className="link" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveClass('link', 'active')
  })

  it('does not add active class when not on target state', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" className="link" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveClass('link')
    expect(screen.getByRole('link')).not.toHaveClass('active')
  })

  it('generates correct href', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('yg-test=page2')
  })

  it('includes data in href', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" data={{ count: 42 }} />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('count=42')
  })

  it('preserves existing query params when replace is false', () => {
    setHash('#?yg-test=page1&existing=value')

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" data={{ new: 'val' }} />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('existing=value')
    expect(href).toContain('new=val')
  })

  it('replaces non-yg params when replace is true', () => {
    setHash('#?yg-test=page1&existing=value')

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <StateLink to="page2" replace />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    const href = link.getAttribute('href') ?? ''
    expect(href).not.toContain('existing=value')
    expect(href).toContain('yg-test=page2')
  })

  it('sets target attribute when provided', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <StateLink to="page1" target="_blank" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
  })

  it('does not set target when not provided', () => {
    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <StateLink to="page1" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).not.toHaveAttribute('target')
  })
})

describe('ExternalButton', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('renders with default children as state name', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha" />
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveTextContent('alpha')
  })

  it('renders custom children', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha">Open Alpha</ExternalButton>
      </StateMachine>
    )

    expect(screen.getByRole('button')).toHaveTextContent('Open Alpha')
  })

  it('updates URL with external machine param on click', async () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha">Go</ExternalButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    await waitFor(() => {
      expect(window.location.hash).toContain('yg-m2=alpha')
    })
  })

  it('includes data in URL', async () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha" data={{ foo: 'bar' }}>Go</ExternalButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    await waitFor(() => {
      expect(window.location.hash).toContain('foo=bar')
    })
  })

  it('preserves existing hash params', async () => {
    setHash('#?yg-m1=page1&existing=value')

    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha">Go</ExternalButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    await waitFor(() => {
      expect(window.location.hash).toContain('existing=value')
      expect(window.location.hash).toContain('yg-m2=alpha')
    })
  })

  it('calls onClick handler when provided', async () => {
    const onClick = vi.fn()

    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha" onClick={onClick}>Go</ExternalButton>
      </StateMachine>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Go'))
    })

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes through additional button props', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalButton machine="m2" to="alpha" disabled data-testid="ext-btn" />
      </StateMachine>
    )

    expect(screen.getByTestId('ext-btn')).toBeDisabled()
  })
})

describe('ExternalLink', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('renders with default children as state name', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveTextContent('alpha')
  })

  it('renders custom children', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha">Open Alpha</ExternalLink>
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveTextContent('Open Alpha')
  })

  it('generates correct href with external machine param', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('yg-m2=alpha')
  })

  it('includes data in href', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" data={{ foo: 'bar' }} />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('foo=bar')
  })

  it('preserves existing hash params in href', () => {
    setHash('#?yg-m1=page1&existing=value')

    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('existing=value')
    expect(href).toContain('yg-m2=alpha')
  })

  it('sets target attribute when provided', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" target="_blank" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
  })

  it('does not set target when not provided', () => {
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" />
      </StateMachine>
    )

    expect(screen.getByRole('link')).not.toHaveAttribute('target')
  })

  it('removes data entries when value is null', () => {
    setHash('#?existing=value')

    // Note: The data prop type doesn't officially include null, but the implementation handles it
    // Using type assertion to test the runtime behavior
    render(
      <StateMachine initial="page1" name="m1">
        <State name="page1"><div>Page 1</div></State>
        <ExternalLink machine="m2" to="alpha" data={{ existing: null as unknown as number, new: 'val' }} />
      </StateMachine>
    )

    const link = screen.getByRole('link')
    const href = link.getAttribute('href') ?? ''
    expect(href).not.toContain('existing=value')
    expect(href).toContain('new=val')
  })
})

describe('Hash change handling', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('responds to external hash changes', async () => {
    const TestComponent = () => {
      const { currentState } = useStateMachine()
      return <span data-testid="current">{currentState}</span>
    }

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <TestComponent />
      </StateMachine>
    )

    expect(screen.getByTestId('current').textContent).toBe('page1')

    await act(async () => {
      setHash('#?yg-test=page2')
    })

    await waitFor(() => {
      expect(screen.getByTestId('current').textContent).toBe('page2')
    })
  })

  it('clears state when hash param is removed', async () => {
    setHash('#?yg-test=page1')

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div data-testid="page1-content">Page 1</div></State>
      </StateMachine>
    )

    expect(screen.getByTestId('page1-content')).toBeInTheDocument()

    await act(async () => {
      setHash('#?other=value')
    })

    // When state is cleared, StateMachine renders null (no children)
    await waitFor(() => {
      expect(screen.queryByTestId('page1-content')).not.toBeInTheDocument()
    })
  })

  it('respects transition restrictions on hash changes', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const TestComponent = () => {
      const { currentState } = useStateMachine()
      return <span data-testid="current">{currentState}</span>
    }

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1" transition={['page2']}><div>Page 1</div></State>
        <State name="page2"><div>Page 2</div></State>
        <State name="page3"><div>Page 3</div></State>
        <TestComponent />
      </StateMachine>
    )

    await act(async () => {
      setHash('#?yg-test=page3')
    })

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Transition from "page1" to "page3" not allowed')
    )
    expect(screen.getByTestId('current').textContent).toBe('page1')

    consoleWarn.mockRestore()
  })
})

describe('Multiple StateMachines', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('can have multiple independent state machines', () => {
    render(
      <>
        <StateMachine initial="a" name="m1">
          <State name="a"><div data-testid="m1-a">M1-A</div></State>
          <State name="b"><div data-testid="m1-b">M1-B</div></State>
        </StateMachine>
        <StateMachine initial="x" name="m2">
          <State name="x"><div data-testid="m2-x">M2-X</div></State>
          <State name="y"><div data-testid="m2-y">M2-Y</div></State>
        </StateMachine>
      </>
    )

    expect(screen.getByTestId('m1-a')).toBeInTheDocument()
    expect(screen.getByTestId('m2-x')).toBeInTheDocument()
  })

  it('machines have separate state params in URL', async () => {
    render(
      <>
        <StateMachine initial="a" name="m1">
          <State name="a"><div>M1-A</div></State>
        </StateMachine>
        <StateMachine initial="x" name="m2">
          <State name="x"><div>M2-X</div></State>
        </StateMachine>
      </>
    )

    await waitFor(() => {
      expect(window.location.hash).toContain('yg-m1=a')
      expect(window.location.hash).toContain('yg-m2=x')
    })
  })

  it('ExternalButton can trigger different machine', async () => {
    const M2Display = () => {
      const { currentState } = useStateMachine()
      return <span data-testid="m2-state">{currentState}</span>
    }

    render(
      <>
        <StateMachine initial="a" name="m1">
          <State name="a">
            <ExternalButton machine="m2" to="y">Go to M2-Y</ExternalButton>
          </State>
        </StateMachine>
        <StateMachine initial="x" name="m2">
          <State name="x"><div>M2-X</div></State>
          <State name="y"><div>M2-Y</div></State>
          <M2Display />
        </StateMachine>
      </>
    )

    expect(screen.getByTestId('m2-state').textContent).toBe('x')

    await act(async () => {
      fireEvent.click(screen.getByText('Go to M2-Y'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('m2-state').textContent).toBe('y')
    })
  })
})

describe('Edge cases', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('handles empty children in State', () => {
    render(
      <StateMachine initial="empty" name="test">
        <State name="empty">{null}</State>
      </StateMachine>
    )

    // Should not throw
    expect(true).toBe(true)
  })

  it('handles numeric query params', () => {
    setHash('#?yg-test=page1&count=42&ratio=3.14')

    let query: Record<string, string | number> = {}

    const TestComponent = () => {
      const ctx = useStateMachine()
      query = ctx.query
      return null
    }

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <TestComponent />
      </StateMachine>
    )

    expect(typeof query.count).toBe('number')
    expect(query.count).toBe(42)
    expect(typeof query.ratio).toBe('number')
    expect(query.ratio).toBe(3.14)
  })

  it('handles string query params that look like numbers but are not', () => {
    setHash('#?yg-test=page1&version=1.2.3')

    let query: Record<string, string | number> = {}

    const TestComponent = () => {
      const ctx = useStateMachine()
      query = ctx.query
      return null
    }

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
        <TestComponent />
      </StateMachine>
    )

    // "1.2.3" is not a valid number, should remain string
    expect(typeof query.version).toBe('string')
    expect(query.version).toBe('1.2.3')
  })

  it('handles malformed hash gracefully', () => {
    window.location.hash = '#notaquerystring'

    render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div data-testid="page">Page 1</div></State>
      </StateMachine>
    )

    // Should use initial state since hash is not #?...
    expect(screen.getByTestId('page')).toBeInTheDocument()
  })

  it('cleans up state registration on unmount', () => {
    const { unmount } = render(
      <StateMachine initial="page1" name="test">
        <State name="page1"><div>Page 1</div></State>
      </StateMachine>
    )

    // Should not throw on unmount
    unmount()
    expect(true).toBe(true)
  })
})
