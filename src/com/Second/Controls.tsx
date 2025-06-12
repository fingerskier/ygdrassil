import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'
import { useEffect } from 'react'


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

        <button onClick={() => gotoState('alpha')}>Reset to Alpha</button>
        <button onClick={() => gotoState('flarn')}>Undeclared State Flarn</button>

        {/* <pre>{JSON.stringify(query, null, 2)}</pre> */}

        <button onClick={() => close()}>Close Machine #2</button>
    </div>
}