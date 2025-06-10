import {useState} from 'react'

export default function Beta() {
    const [count, setCount] = useState(0)

    return <div>
        <h1>Beta</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
    </div>
}
