import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src./app_001.js'  // ✅ Changed this line
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
