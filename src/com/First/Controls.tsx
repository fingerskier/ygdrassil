import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'
import {M1} from '@/com/constants'


export default function Controls() {
    const {availableTransitions, gotoState, query} = useStateMachine()

    
    return <div>
        All States:
        {M1.ST.map(state => <StateButton key={state} to={state}>{state}</StateButton>)}

        <br />

        Allowed Transitions:
        {availableTransitions?.map && availableTransitions.map(
            state => <StateButton key={state} to={state}>{state}</StateButton> 
        )}

        <br />

        <button onClick={() => gotoState('one')}>Reset to One</button>

        <pre>{JSON.stringify(query, null, 2)}</pre>
    </div>
}