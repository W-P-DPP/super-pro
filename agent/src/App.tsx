import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [result, setResult] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  const testClaude = async () => {
    setLoading(true)
    try {
      const res = await window.claude.testSDK()
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={testClaude} disabled={loading}>
          {loading ? 'loading...' : 'claude'}
        </button>
        {result && (
          <pre style={{ textAlign: 'left', marginTop: 16 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </>
  )
}

export default App
