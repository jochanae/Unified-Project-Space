import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import App from './App.jsx'
import AssetsPage from './pages/AssetsPage.jsx'
import AddPage from './pages/AddPage.jsx'
import './index.css'

function BottomNav() {
  const base = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    letterSpacing: '0.1em',
    fontFamily: 'Inter, sans-serif',
    padding: '10px 20px 6px',
    color: 'rgba(255,255,255,0.3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    flex: 1,
    transition: 'color 0.2s ease',
  }
  const activeStyle = { color: '#fbbf24' }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: 'rgba(8,8,18,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      <NavLink to="/" end style={({ isActive }) => ({ ...base, ...(isActive ? activeStyle : {}) })}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        OVERVIEW
      </NavLink>

      <NavLink to="/assets" style={({ isActive }) => ({ ...base, ...(isActive ? activeStyle : {}) })}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M2 10h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        ASSETS
      </NavLink>

      <NavLink to="/add" style={({ isActive }) => ({ ...base, ...(isActive ? activeStyle : {}) })}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 2,
          marginTop: -6,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        ADD
      </NavLink>
    </nav>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <div style={{ paddingBottom: 72 }}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/add" element={<AddPage />} />
        </Routes>
      </div>
      <BottomNav />
    </HashRouter>
  </React.StrictMode>
)
