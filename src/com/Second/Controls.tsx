import { useEffect } from 'react'
import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'


export default function Controls() {
    const {availableTransitions, currentState, gotoState} = useStateMachine()
    
    useEffect(() => {
        console.log('allowedTransitions', availableTransitions)
    }, [availableTransitions])
    
    return <div>
        Allowed Transitions {currentState ? `(from ${currentState})` : ''}:
        {availableTransitions?.map && availableTransitions.map(
            state => <StateButton key={state} to={state}>{state}</StateButton> 
        )}

        <br />

        <button onClick={() => gotoState('alpha')}>Reset to Alpha</button>
        <button onClick={() => gotoState('flarn')}>Undeclared State Flarn</button>
    </div>
}