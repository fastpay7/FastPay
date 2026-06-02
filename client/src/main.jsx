import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#1E1E32',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        },
        success: { iconTheme: { primary: '#2ED573', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#FF4757', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
)
