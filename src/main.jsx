import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'  // ✅ Correct - just "./" since we're already in srca

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
