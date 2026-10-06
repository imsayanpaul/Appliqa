import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans/wdth.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './index.css'
import './styles/system.css'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MotionConfig reducedMotion="user">
            <App />
        </MotionConfig>
    </StrictMode>,
)
