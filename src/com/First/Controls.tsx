import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'
import {M1} from '@/com/constants'


export default function Controls() {
    const {gotoState, close} = useStateMachine()

    
    return <div>
        All States:
        {M1.ST.map(state => <StateButton key={state} to={state}>{state}</StateButton>)}

        <br />

        <button onClick={() => gotoState('one')}>Reset to One</button>

        {/* <pre>{JSON.stringify(query, null, 2)}</pre> */}
        <button onClick={() => close()}>Close Machine #1</button>
    </div>
}