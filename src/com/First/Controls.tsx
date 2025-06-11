import {useEffect, useState} from 'react'
import {StateButton} from '@/StateMachine'
import {useStateMachine} from '@/StateMachine'


export default function Controls() {
    const {currentState, gotoState} = useStateMachine()
    
    useEffect(() => {
        console.log('currentState', currentState)
    }, [currentState])
    
    return <div>
        <StateButton to='one'>One</StateButton>
        <StateButton to='two'>Two</StateButton>
        <StateButton to='three'>Three</StateButton>

        <br />

        <button onClick={() => gotoState('one')}>Reset to One</button>
    </div>
}