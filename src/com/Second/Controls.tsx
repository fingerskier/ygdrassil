import {StateButton,useStateMachine} from '@/StateMachine'
import { useEffect } from 'react'

const defaults = {
    alpha: 0,
    beta: 'nada',
    gamma: 0,
    delta: 0
}

export default function Controls() {
    const {availableTransitions, currentState, gotoState, close} = useStateMachine()

    useEffect(() => {
        console.log('availableTransitions', availableTransitions)
    }, [availableTransitions])

    return <div>
        Allowed Transitions {currentState ? `(from ${currentState})` : ''}:
        {availableTransitions?.map && availableTransitions.map(
            state => <StateButton key={state} to={state}>{state}</StateButton> 
        )}

        <br />

        <StateButton to='alpha' data={defaults}>Reset to Alpha</StateButton>
        <button onClick={() => gotoState('flarn')}>Undeclared State Flarn</button>

        {/* <pre>{JSON.stringify(query, null, 2)}</pre> */}

        <button onClick={() => close()}>Close Machine #2</button>
    </div>
}