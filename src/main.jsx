import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
// Keep app styles as Vite entry dependencies for reliable dev updates.
import './styles/portal.css'
import './styles/workspace.css'
import App from './app/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
