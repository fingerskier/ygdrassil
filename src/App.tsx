import {StateMachine, State, StateButton} from '@/StateMachine'
import One from '@/com/First/One'
import Two from '@/com/First/Two'
import Three from '@/com/First/Three'
import Controls1 from '@/com/First/Controls'
import SecondMachine from '@/com/Second'
import {M1} from '@/com/constants'
import './App.css'


export default function App() {
  return <>
    <StateButton className='badge' to='one' machine='app'>Start machine #1</StateButton>
    <StateButton className='badge' to='two' machine='aux'>Start machine #2</StateButton>

    <StateMachine name='app'>
      <div className='state machine'>
        <h1>First State-Machine</h1>
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
      </div>
    </StateMachine>

    <div className='state machine'>
      <StateMachine name='aux'>
        <SecondMachine />
      </StateMachine>
    </div>
  </>
}