import {StateButton} from '@/StateMachine'

export default function Controls2() {
    return <div>
        <StateButton to='alpha'>Alpha</StateButton>
        <StateButton to='beta'>Beta</StateButton>
        <StateButton to='gamma'>Gamma</StateButton>
        <StateButton to='delta'>Delta</StateButton>
    </div>
}
