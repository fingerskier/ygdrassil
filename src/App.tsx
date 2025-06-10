import {StateMachine, State} from '@/StateMachine'
import One from '@/com/One'
import Two from '@/com/Two'
import Three from '@/com/Three'
import Controls from '@/com/Controls'


export default function App() {
  return <>
    <StateMachine initial='one' name='app'>
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