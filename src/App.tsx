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
    <div className='banner'>
      <h1>
        <img src={logo} alt='Ygdrassil logo' height="64" />
        Ygdrassil
        <img src={logo} alt='Ygdrassil logo' height="64" />
      </h1>
      <p>A basic, declarative React state machine library.</p>
      <p>
        <a href='https://github.com/fingerskier/ygdrassil' target='_blank'>GitHub</a>
        {' | '}
        <a href='https://www.npmjs.com/package/ygdrassil' target='_blank'>NPM</a>
        {' | '}
        <a href='/ygdrassil/vanilla_example.html' target='_blank'>Vanilla JS Example</a>
      </p>
    </div>
    <a href='/'>Restart</a>

    <ExternalButton className='badge' to='overview' machine='docs'>Documentation</ExternalButton>
    <ExternalButton className='badge' to='one' machine='app'>Start machine #1</ExternalButton>

    <StateMachine
      name='app'
      className='state machine one'
      onEnter={logNav('enter', 'app')}
      onExit={logNav('exit', 'app')}
    >
      <h1>First State-Machine</h1>
        <ExternalButton className='badge'
          to='alpha' machine='aux'
          data={{alpha: 0, beta: 'nada', gamma: 0, delta: 0}}
        >Start machine #2</ExternalButton>
        <Controls1 />

        <State name={M1.ST[0]}>
          <One />
        </State>

        <State name={M1.ST[1]}>
          <Two />
        </State>

        <State name={M1.ST[2]}>
          <Three />
        </State>
    </StateMachine>

    <StateMachine
      name='aux'
      initial='alpha'
      onEnter={logNav('enter', 'aux')}
      onExit={logNav('exit', 'aux')}
    >
        <SecondMachine />
    </StateMachine>

    <StateMachine name='docs' initial='overview'>
        <DocsMachine />
    </StateMachine>

    {/* Navigation History - demonstrates global onEnter/onExit handlers */}
    {navHistory.length > 0 && (
      <div className='nav-history'>
        <h3>Navigation History (Global Handlers)</h3>
        <ul>
          {navHistory.map((entry, i) => (
            <li key={i} className={entry.type}>
              <span className='time'>{entry.time}</span>
              <span className='type'>{entry.type === 'enter' ? 'ENTER' : 'EXIT'}</span>
              <span className='machine'>{entry.machine}</span>
              <span className='state'>{entry.state}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </>}