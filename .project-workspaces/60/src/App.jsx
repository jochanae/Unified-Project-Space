import React from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Plants from './pages/Plants'
import Settings from './pages/Settings'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '🌿' },
  { to: '/plants', label: 'Plants', icon: '🪴' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
]

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        {/* Top nav */}
        <header className="bg-garden-green text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-semibold tracking-tight">SmartGarden</span>
          </div>
          <nav className="flex gap-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-garden-green'
                      : 'text-white/80 hover:bg-white/20'
                  }`
                }
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plants" element={<Plants />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}