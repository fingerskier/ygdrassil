import {useState} from 'react'


export default function Three() {
    const [count, setCount] = useState(0)

    return <div>
        <h1>Three</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
        <p>This state does not remember count via query-param</p>
    </div>
}