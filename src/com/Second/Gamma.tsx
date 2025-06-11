import {useState} from 'react'

export default function Gamma() {
    const [count, setCount] = useState(0)

    return <div>
        <h1>Gamma</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
    </div>
}
