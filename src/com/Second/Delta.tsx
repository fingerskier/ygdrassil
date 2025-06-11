import {useState} from 'react'
import {useStateMachine} from '@/StateMachine'


export default function Delta() {
    const {query, setQuery, gotoState} = useStateMachine()
    

    const restart = ()=>{
      setQuery({alpha: '0', beta: '0', gamma: '0', delta: '0'})
      gotoState('alpha')
    }
  

    return <div>
        <h1>Delta</h1>
        <button onClick={() => setQuery({delta:+query.delta+1})}>Count</button>
        <p>Persisted Count: {query?.delta}</p>

        <button onClick={restart}>Restart</button>
    </div>
}
