import {StateButton, useStateMachine} from '@/StateMachine'
import {DOCS} from '@/com/constants'


export default function Controls() {
    const {currentState, gotoState, close, availableTransitions} = useStateMachine()


    return <div className="doc-controls">
        <div>
            <strong>Current Section:</strong> {currentState}
        </div>

        <div>
            <strong>Available Sections:</strong>
            {availableTransitions?.map && availableTransitions.map(
                state => <StateButton key={state} to={state}>{state}</StateButton>
            )}
        </div>

        <div>
            <strong>All Documentation:</strong>
            {DOCS.ST.map(state => <StateButton key={state} to={state}>{state}</StateButton>)}
        </div>

        <div>
            <button onClick={() => gotoState('overview')}>Back to Overview</button>
            <button onClick={() => close()}>Close Docs</button>
        </div>
    </div>
}
