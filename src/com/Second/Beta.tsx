import {useStateMachine, StateButton} from '@/StateMachine'


export default function Beta() {
    const {query, setQuery} = useStateMachine()


    return <div>
        <h1>Beta</h1>
        
        <label>Persisted string:</label>
        <input type="text" value={query?.beta} onChange={(e) => setQuery({beta: e.target.value})} />

        <pre>{JSON.stringify(query, null, 2)}</pre>

        <p>This state remembers `beta` string via query-param</p>

        <StateButton to="alpha" data={{flarn:null}}>
            Go to Alpha removing `flarn`
        </StateButton>
    </div>
}