import {useState, useCallback} from 'react'
import {StateMachine, State, ExternalButton} from '@/StateMachine'
import One from '@/com/First/One'
import Two from '@/com/First/Two'
import Three from '@/com/First/Three'
import Controls1 from '@/com/First/Controls'
import SecondMachine from '@/com/Second'
import DocsMachine from '@/com/Docs'
import {M1} from '@/com/constants'

import './App.css'
import logo from '@/assets/logo.png'


export default function App() {
  // Navigation history for demonstrating global onEnter/onExit handlers
  const [navHistory, setNavHistory] = useState<{type: 'enter' | 'exit', state: string, machine: string, time: string}[]>([])

  const logNav = useCallback((type: 'enter' | 'exit', machine: string) => (state: string) => {
    setNavHistory(prev => [
      ...prev.slice(-9), // Keep last 10 entries
      { type, state, machine, time: new Date().toLocaleTimeString() }
    ])
  }, [])

  return <>
    <header className='site-header'>
      <a className='brand' href='https://github.com/fingerskier/ygdrassil'>
        <img src={logo} alt='' height="28" />
        Ygdrassil
      </a>
      <span className='tagline'>Declarative URL-hash state machines for React</span>
      <nav className='site-links'>
        <a href='https://github.com/fingerskier/ygdrassil' target='_blank'>GitHub</a>
        <a href='https://www.npmjs.com/package/ygdrassil' target='_blank'>NPM</a>
        <a href='/ygdrassil/vanilla_example.html' target='_blank'>Vanilla demo</a>
      </nav>
    </header>

    <div className='toolbar'>
      <a href='/'>Restart</a>
      <ExternalButton to='overview' machine='docs'>Open documentation</ExternalButton>
      <ExternalButton to='one' machine='app'>Start machine #1</ExternalButton>
    </div>

    <StateMachine
      name='app'
      className='machine one'
      onEnter={logNav('enter', 'app')}
      onExit={logNav('exit', 'app')}
      onTransitionDenied={(from, to) => console.warn('denied', from, to)}
    >
      <h1>First machine <code className='param-chip'>yg-app</code></h1>
        <ExternalButton
          to='alpha' machine='aux'
          data={{alpha: 0, beta: 'nada', gamma: 0, delta: 0}}
        >Start machine #2</ExternalButton>
        <Controls1 />

        <State name={M1.ST[0]} transition={M1.one}>
          <One />
        </State>

        <State name={M1.ST[1]} transition={M1.two}>
          <Two />
        </State>

        <State name={M1.ST[2]} transition={M1.three}>
          <Three />
        </State>
    </StateMachine>

    <StateMachine
      name='aux'
      initial='alpha'
      className='machine two'
      onEnter={logNav('enter', 'aux')}
      onExit={logNav('exit', 'aux')}
    >
        <SecondMachine />
    </StateMachine>

    <StateMachine name='docs' initial='overview' className='machine docs'>
        <DocsMachine />
    </StateMachine>

    {/* Navigation History - demonstrates global onEnter/onExit handlers */}
    {navHistory.length > 0 && (
      <div className='nav-history'>
        <h3>Navigation history</h3>
        <ul>
          {navHistory.map((entry, i) => (
            <li key={i} className={entry.type} data-machine={entry.machine}>
              <span className='time'>{entry.time}</span>
              <span className='type'>{entry.type === 'enter' ? 'ENTER' : 'EXIT'}</span>
              <span className='machine-name'>{entry.machine}</span>
              <span className='state'>{entry.state}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </>}