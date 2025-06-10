import { useState } from 'react'
import {StateMachine, State} from './StateMachineContext'
import One from './One'
import Two from './Two'
import Three from './Three'
import Controls from './Controls'

function App() {
  const [count, setCount] = useState(0)

  return <>
    <StateMachine initial='one'>
      <Controls />

      <State name="one">
        <One />
      </State>

      <State name="two">
        <Two />
      </State>

      <State name="three">
        <Three />
      </State>
    </StateMachine>
  </>
}

export default App
