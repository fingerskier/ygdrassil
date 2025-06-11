import { State, StateMachine, useStateMachine } from '@/StateMachine'
import Alpha from './Alpha'
import Beta from './Beta'
import Gamma from './Gamma'
import Delta from './Delta'
import Controls2 from './Controls'
import { M2 } from '@/com/constants'


export default function SecondMachine() {
  return <>
    <StateMachine initial='alpha' name='aux'>
      <h1>Second State-Machine</h1>
      <Controls2 />

      <State name={M2.ST[0]} transition={M2.alpha}>
        <Alpha />
      </State>

      <State name={M2.ST[1]} transition={M2.beta}>
        <Beta />
      </State>

      <State name={M2.ST[2]} transition={M2.gamma}
        onEnter={() => console.log('gamma entered')}
        onExit={() => console.log('gamma exited')}
      >
        <Gamma />
      </State>

      <State name={M2.ST[3]} transition={M2.delta}
        onEnter={() => console.log('delta entered')}
        onExit={() => console.log('delta exited')}
      >
        <Delta />
      </State>
    </StateMachine>
  </>
}