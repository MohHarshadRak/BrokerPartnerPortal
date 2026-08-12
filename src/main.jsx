import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      {/* Derived from vite.config.js's base (Vite exposes it at runtime as BASE_URL) so the
          virtual directory only has to change in one place — still needs to match
          public/web.config's rewrite target separately, since that's IIS-side, not Vite. */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
