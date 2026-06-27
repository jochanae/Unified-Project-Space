import React, { useState } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Plants from './pages/Plants'
import Settings from './pages/Settings'

function NavBar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', emoji: '🏠' },
    { path: '/plants', label: 'Plants', emoji: '🌿' },
    { path: '/settings', label: 'Settings', emoji: '⚙️' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-garden-100 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ path, label, emoji }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path)

          return (
            <NavLink
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-garden-700 bg-garden-50'
                  : 'text-gray-400 hover:text-garden-500'
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function AppShell() {
  return (
    <div className="min-h-screen bg-garden-50 pb-20">
      <header className="bg-white border-b border-garden-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <h1 className="text-xl font-bold text-garden-800">SmartGarden</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <NavBar />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}