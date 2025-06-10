import {StateMachine, State} from '@/StateMachine'
import One from '@/com/One'
import Two from '@/com/Two'
import Three from '@/com/Three'
import Controls from '@/com/Controls'


export default function App() {
  return <>
    <StateMachine initial='one' name='app'>
      <Controls />

      <State name="one" transition={['two']}>
        <One />
      </State>

      <State name="two" transition={['one', 'three']}>
        <Two />
      </State>

      <State name="three" transition={['one']}>
        <Three />
      </State>
    </StateMachine>
  </>
}