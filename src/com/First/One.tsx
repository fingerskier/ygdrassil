import {useEffect,useState} from 'react'
import {useStateMachine} from '@/StateMachine'


export default function One() {
    const {query, setQuery} = useStateMachine()

    const [count, setCount] = useState(Number(query['one']) || 0)
    
    
    useEffect(() => {
        setQuery({one: String(count)})
    }, [count, setQuery])
    
    
    return <div>
        <h1>One</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
        <p>This state remembers count via query-param</p>
    </div>
}