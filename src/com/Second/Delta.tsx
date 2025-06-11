import {useState} from 'react'

export default function Delta() {
    const [count, setCount] = useState(0)

    return <div>
        <h1>Delta</h1>
        <button onClick={() => setCount(count + 1)}>Count</button>
        <p>Count: {count}</p>
    </div>
}
