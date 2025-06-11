import {useStateMachine} from '@/StateMachine'


export default function Beta() {
    const {query, setQuery} = useStateMachine()


    return <div>
        <h1>Beta</h1>
        
        <label>Persisted string:</label>
        <input type="text" value={query?.beta} onChange={(e) => setQuery({beta: e.target.value})} />
    </div>
}