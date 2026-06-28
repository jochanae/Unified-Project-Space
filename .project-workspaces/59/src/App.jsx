import React from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Plants from './pages/Plants.jsx'
import Settings from './pages/Settings.jsx'

function Nav() {
  const base = 'flex flex-col items-center gap-1 text-xs font-medium transition-colors'
  const active = 'text-garden-700'
  const inactive = 'text-gray-400'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around z-50">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <span className="text-xl">🌿</span>
        Dashboard
      </NavLink>
      <NavLink to="/plants" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <span className="text-xl">🪴</span>
        Plants
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <span className="text-xl">⚙️</span>
        Settings
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen pb-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <Nav />
      </div>
    </HashRouter>
  )
}