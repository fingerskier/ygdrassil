import {StateButton} from '@/StateMachine'


export default function Controls() {
    return <div>
        <StateButton to='one'>One</StateButton>
        <StateButton to='two'>Two</StateButton>
        <StateButton to='three'>Three</StateButton>
    </div>
}