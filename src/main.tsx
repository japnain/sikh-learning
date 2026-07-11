import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './styles/foundations.css'
import './styles/navigation.css'
import './styles/home.css'
import './styles/reader.css'
import './styles/catalog.css'
import './styles/library.css'
import './styles/settings.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { installGlobalDiagnosticHandlers } from './utils/diagnostics.ts'

installGlobalDiagnosticHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
