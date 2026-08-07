import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { KeycloakProvider } from './contexts/KeycloakContext'
import App from './App.tsx'
import { setupGlobalFetchInterceptor } from './utils/proxyIdCleaner'

// Set up global fetch interceptor to strip proxy suffixes from outgoing API calls
setupGlobalFetchInterceptor();

// Dynamic viewport height for mobile browsers (address bar resize)
const setVH = () => document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`)
setVH()
window.addEventListener('resize', setVH)

createRoot(document.getElementById('root')!).render(
// <StrictMode>
    <KeycloakProvider>
      <App />
    </KeycloakProvider>
// </StrictMode>,
)
