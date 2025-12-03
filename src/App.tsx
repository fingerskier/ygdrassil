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
      </p>
    </div>
    <a href='/'>Restart</a>

    <ExternalButton className='badge' to='overview' machine='docs'>Documentation</ExternalButton>
    <ExternalButton className='badge' to='one' machine='app'>Start machine #1</ExternalButton>

    <StateMachine name='app' className='state machine one'>
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

    <StateMachine name='aux' initial='alpha'>
        <SecondMachine />
    </StateMachine>

    <StateMachine name='docs' initial='overview'>
        <DocsMachine />
    </StateMachine>
  </>}