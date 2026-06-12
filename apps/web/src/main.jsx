import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import MsalProviderWrapper from '@/auth/MsalProviderWrapper.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <MsalProviderWrapper>
    <App />
  </MsalProviderWrapper>
)
