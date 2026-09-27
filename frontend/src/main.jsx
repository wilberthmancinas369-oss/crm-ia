import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import './styles/variables.css'
import './styles/global.css'
import './index.css'
import { CRMProvider } from './context/CRMContext'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CRMProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CRMProvider>
  </StrictMode>,
)
