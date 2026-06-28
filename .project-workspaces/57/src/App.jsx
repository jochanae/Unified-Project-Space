import React from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Plants from './pages/Plants'
import Settings from './pages/Settings'

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
          isActive
            ? 'text-garden-700'
            : 'text-garden-400 hover:text-garden-600'
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-sm">
        {/* Header */}
        <header className="bg-garden-700 text-white px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <h1 className="text-lg font-semibold tracking-tight">SmartGarden</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plants" element={<Plants />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Bottom nav */}
        <nav className="border-t border-garden-100 bg-white flex justify-around py-1 sticky bottom-0">
          <NavItem to="/" label="Dashboard" icon="🏠" />
          <NavItem to="/plants" label="Plants" icon="🌱" />
          <NavItem to="/settings" label="Settings" icon="⚙️" />
        </nav>
      </div>
    </HashRouter>
  )
}