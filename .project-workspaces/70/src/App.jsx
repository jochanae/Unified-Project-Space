import React, { useState, useRef, useCallback } from 'react'
import SparklineChart from './components/SparklineChart.jsx'
import AssetDistribution from './components/AssetDistribution.jsx'
import AssetList from './components/AssetList.jsx'
import QuickTransaction from './components/QuickTransaction.jsx'
import Toast from './components/Toast.jsx'

// ── Initial mock portfolio data ──────────────────────────────────────────────
const INITIAL_ASSETS = [
  {
    id: 1,
    name: 'Patek Philippe Nautilus 5711',
    category: 'Watches',
    value: 148000,
    acquired: '2021-03',
    change24h: +2.4,
    notes: 'Steel, full set'
  },
  {
    id: 2,
    name: 'Richard Mille RM 011',
    category: 'Watches',
    value: 215000,
    acquired: '2022-07',
    change24h: -0.8,
    notes: 'Titanium flyback'
  },
  {
    id: 3,
    name: 'Basquiat — Untitled (1984)',
    category: 'Fine Art',
    value: 390000,
    acquired: '2020-11',
    change24h: +1.1,
    notes: 'Acrylic on canvas, authenticated'
  },
  {
    id: 4,
    name: 'Kaws — BFF Companion',
    category: 'Fine Art',
    value: 62000,
    acquired: '2023-01',
    change24h: +0.3,
    notes: 'Original bronze sculpture'
  },
  {
    id: 5,
    name: '1986 Chanel Classic Flap',
    category: 'Fashion',
    value: 18500,
    acquired: '2023-08',
    change24h: +0.9,
    notes: 'Black lambskin, gold HW'
  },
  {
    id: 6,
    name: 'Hermès Birkin 35 Himalaya',
    category: 'Fashion',
    value: 295000,
    acquired: '2022-03',
    change24h: +3.2,
    notes: 'Niloticus croc, palladium HW'
  },
  {
    id: 7,
    name: 'Audemars Piguet Royal Oak',
    category: 'Watches',
    value: 98000,
    acquired: '2023-05',
    change24h: -1.2,
    notes: 'Rose gold, 41mm'
  }
]

// 24-hour sparkline data points (simulated portfolio valuation in thousands)
const SPARKLINE_DATA = [
  1218, 1221, 1219, 1224, 1228, 1222, 1226, 1230, 1228, 1235,
  1232, 1238, 1241, 1237, 1243, 1246, 1244, 1249, 1252, 1248,
  1255, 1258, 1254, 1262, 1265, 1260, 1268, 1272, 1270, 1226,
  1231, 1236, 1240, 1244, 1248, 1252, 1256, 1260, 1264, 1268,
  1274, 1278, 1226, 1230, 1234, 1238, 1226, 1226, 1226, 1226
]

// ── Natural language parser ──────────────────────────────────────────────────
function parseTransaction(text) {
  const lower = text.toLowerCase()

  // Detect category
  let category = 'Fine Art'
  if (/watch|rolex|patek|audemars|richard mille|ap |omega|cartier tank|chronograph/i.test(text)) {
    category = 'Watches'
  } else if (/bag|handbag|tote|chanel|hermès|hermes|birkin|kelly|louis vuitton|gucci|prada|dior|fashion|clothing|jacket|coat|dress|shoe|sneaker|boots/i.test(text)) {
    category = 'Fashion'
  } else if (/art|painting|sculpture|print|canvas|drawing|photograph|basquiat|kaws|hirst|murakami/i.test(text)) {
    category = 'Fine Art'
  }

  // Extract value
  let value = 0
  const valuePatterns = [
    /\$\s*([\d,]+(?:\.\d{2})?)\s*k/i,
    /\$\s*([\d,]+(?:\.\d{2})?)/,
    /([\d,]+(?:\.\d{2})?)\s*k(?:[\s,]|$)/i,
    /valued?\s+(?:at\s+)?\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:worth|cost|price|priced\s+at)\s+\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)/
  ]

  for (const pattern of valuePatterns) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/,/g, '')
      value = parseFloat(raw)
      if (pattern.source.includes('k')) value *= 1000
      break
    }
  }

  // Extract name — remove "add" prefix and value reference
  let name = text
    .replace(/^(?:add|log|record|new|track)\s+/i, '')
    .replace(/,?\s*valued?\s+at\s+\$?[\d,k.]+/i, '')
    .replace(/,?\s*(?:worth|cost|price|priced\s+at)\s+\$?[\d,k.]+/i, '')
    .replace(/\$\s*[\d,k.]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Capitalize first letter of each meaningful word
  name = name.replace(/\b\w/g, c => c.toUpperCase())
  if (!name) name = 'New Asset'

  return { name, category, value, change24h: 0, notes: 'Added via Quick Transaction' }
}

// ── Format helpers ───────────────────────────────────────────────────────────
function formatCurrency(value) {
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(2) + 'M'
  }
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function totalPortfolioValue(assets) {
  return assets.reduce((sum, a) => sum + a.value, 0)
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [assets, setAssets] = useState(INITIAL_ASSETS)
  const [activeCategory, setActiveCategory] = useState(null)
  const [toast, setToast] = useState(null)
  const nextId = useRef(100)

  const portfolioValue = totalPortfolioValue(assets)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const handleAddAsset = useCallback((text) => {
    if (!text.trim()) return

    const parsed = parseTransaction(text)
    if (parsed.value === 0) {
      showToast('Include a value — e.g. "valued at $4500"', 'error')
      return
    }

    const newAsset = {
      id: nextId.current++,
      acquired: new Date().toISOString().slice(0, 7),
      ...parsed
    }
    setAssets(prev => [newAsset, ...prev])
    showToast(`${parsed.name} added to ledger`, 'success')
  }, [showToast])

  const filteredAssets = activeCategory
    ? assets.filter(a => a.category === activeCategory)
    : assets

  const sparklineChange = (() => {
    const first = SPARKLINE_DATA[0]
    const last = SPARKLINE_DATA[SPARKLINE_DATA.length - 1]
    return ((last - first) / first * 100).toFixed(2)
  })()

  const isUp = parseFloat(sparklineChange) >= 0

  return (
    <div className="obsidian-bg min-h-dvh">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-6 safe-bottom flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="section-label" style={{ letterSpacing: '0.18em' }}>The Obsidian Ledger</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {assets.length} assets tracked
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.18)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="#fbbf24" strokeWidth="1.5"/>
              <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* ── Zone 1: Portfolio Summary Card ── */}
        <div className="glass-card-elevated p-6 amber-glow-border">
          <div className="flex items-start justify-between mb-1">
            <p className="section-label">Total Portfolio Value</p>
            <span className={isUp ? 'trend-up' : 'trend-down'}>
              {isUp ? '↑' : '↓'} {Math.abs(sparklineChange)}% 24h
            </span>
          </div>

          <div className="mt-3 mb-5">
            <span
              className="value-display amber-glow"
              style={{ fontSize: 'clamp(2.4rem, 10vw, 3.2rem)', lineHeight: 1 }}
            >
              {formatCurrency(portfolioValue)}
            </span>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Updated just now · USD
            </p>
          </div>

          {/* Sparkline */}
          <SparklineChart data={SPARKLINE_DATA} isUp={isUp} />

          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>24h ago</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Now</span>
          </div>
        </div>

        {/* ── Zone 2: Asset Distribution ── */}
        <AssetDistribution
          assets={assets}
          activeCategory={activeCategory}
          onCategorySelect={setActiveCategory}
        />

        {/* ── Asset List ── */}
        <div className="glass-card px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">
              {activeCategory ? activeCategory : 'All Assets'}
            </p>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
          <AssetList assets={filteredAssets} />
        </div>

        {/* ── Zone 3: Quick Transaction ── */}
        <QuickTransaction onSubmit={handleAddAsset} />

      </div>

      {/* Toast */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}