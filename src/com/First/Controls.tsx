import { useEffect } from 'react'
import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'
import {M1} from '@/com/constants'


export default function Controls() {
    const {allowedTransitions, currentState, gotoState} = useStateMachine()
    
    useEffect(() => {
        console.log('allowedTransitions', allowedTransitions)
    }, [allowedTransitions])
    
    return <div>
        All States:
        {M1.ST.map(state => <StateButton key={state} to={state}>{state}</StateButton>)}

        <br />

        Allowed Transitions:
        {allowedTransitions?.map && allowedTransitions.map(
            state => <StateButton key={state} to={state}>{state}</StateButton> 
        )}

        <br />

        <button onClick={() => gotoState('one')}>Reset to One</button>
    </div>
}