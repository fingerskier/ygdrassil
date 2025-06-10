import {useState} from 'react'

export default function Alpha() {
    const [count, setCount] = useState(0)

    return <div>
        <h1>Alpha</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
    </div>
}
