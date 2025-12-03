import { State } from '@/StateMachine'
import Overview from './Overview'
import StateMachineDoc from './StateMachineDoc'
import StateDoc from './StateDoc'
import NavigationDoc from './NavigationDoc'
import HookDoc from './HookDoc'
import Examples from './Examples'
import ApiDoc from './ApiDoc'
import Controls from './Controls'
import { DOCS } from '@/com/constants'


export default function DocsMachine() {
  return <>
    <h1>Ygdrassil Documentation</h1>
    <Controls />

    <State name={DOCS.ST[0]} transition={DOCS.overview}>
      <Overview />
    </State>

    <State name={DOCS.ST[1]} transition={DOCS.statemachine}>
      <StateMachineDoc />
    </State>

    <State name={DOCS.ST[2]} transition={DOCS.state}>
      <StateDoc />
    </State>

    <State name={DOCS.ST[3]} transition={DOCS.navigation}>
      <NavigationDoc />
    </State>

    <State name={DOCS.ST[4]} transition={DOCS.hook}>
      <HookDoc />
    </State>

    <State name={DOCS.ST[5]} transition={DOCS.examples}>
      <Examples />
    </State>

    <State name={DOCS.ST[6]} transition={DOCS.api}>
      <ApiDoc />
    </State>
  </>
}
