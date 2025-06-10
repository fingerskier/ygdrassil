import {useState} from 'react'
import {useStateMachine} from './StateMachineContext'


export default function Controls() {
    const {gotoState} = useStateMachine()


    return <div>
        <button onClick={()=>gotoState('one')}>One</button>
        <button onClick={()=>gotoState('two')}>Two</button>
        <button onClick={()=>gotoState('three')}>Three</button>
    </div>
}