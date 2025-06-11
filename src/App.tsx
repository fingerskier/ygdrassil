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
import {M1, M2} from '@/com/constants'


export default function App() {
  return <>
    <StateMachine initial='one' name='app'>
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

    <StateMachine initial='alpha' name='aux'>
      <h1>A Second State-Machine</h1>
      <Controls2 />

      <State name={M2.ST[0]} transition={M2.alpha}>
        <Alpha />
      </State>

      <State name={M2.ST[1]} transition={M2.beta}>
        <Beta />
      </State>

      <State name={M2.ST[2]} transition={M2.gamma}>
        <Gamma />
      </State>

      <State name={M2.ST[3]} transition={M2.delta}>
        <Delta />
      </State>
    </StateMachine>
  </>
}