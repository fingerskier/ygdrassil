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
import SecondMachine from '@/com/Second'
import {M1, M2} from '@/com/constants'
import './App.css'


export default function App() {
  return <>
    <div className='state machine'>
      <StateMachine initial='one' name='app'>
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
      </StateMachine>
    </div>

    <div className='state machine'>
        <SecondMachine />
    </div>
  </>
}