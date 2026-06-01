// MUST be first — sanitizes bad localStorage redirect values before app-params.js runs
import '@/lib/earlyRedirectSanitize.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)