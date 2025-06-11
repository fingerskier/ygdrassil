import {StateMachine, State} from '@/StateMachine'
import One from '@/com/First/One'
import Two from '@/com/First/Two'
import Three from '@/com/First/Three'
import Controls1 from '@/com/First/Controls'
import Alpha from '@/com/Second/Alpha'
import Beta from '@/com/Second/Beta'
import Controls2 from '@/com/Second/Controls'
import Gamma from '@/com/Second/Gamma'
import Delta from '@/com/Second/Delta'


export default function App() {
  return <>
    <StateMachine initial='one' name='app'>
      <Controls1 />

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

    <StateMachine initial='alpha' name='aux'>
      <h1>A Second State-Machine</h1>
      <Controls2 />

      <State name="alpha" transition={['beta']}>
        <Alpha />
      </State>

      <State name="beta" transition={['alpha', 'gamma']}>
        <Beta />
      </State>

      <State name="gamma" transition={['delta', 'beta']}>
        <Gamma />
      </State>

      <State name="delta" transition={['gamma', 'alpha']}>
        <Delta />
      </State>
    </StateMachine>
  </>
}