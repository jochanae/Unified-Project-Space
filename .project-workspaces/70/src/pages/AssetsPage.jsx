import React, { useState, useEffect, useCallback } from 'react'
import AssetDistribution from '../components/AssetDistribution.jsx'
import AssetList from '../components/AssetList.jsx'
import Toast from '../components/Toast.jsx'

function centsToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    value: Number(row.value_cents) / 100,
    acquired: row.created_at ? row.created_at.slice(0, 7) : '—',
    change24h: 0,
    notes: row.notes ?? '',
  }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ledger/assets', { credentials: 'include' })
        if (!res.ok) throw new Error('fetch failed')
        const rows = await res.json()
        setAssets(rows.map(centsToAsset))
      } catch {
        showToast('Could not load assets — check your connection', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredAssets = activeCategory
    ? assets.filter(a => a.category === activeCategory)
    : assets

  return (
    <div className="obsidian-bg min-h-dvh">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-6 safe-bottom flex flex-col gap-5">

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="section-label" style={{ letterSpacing: '0.18em' }}>Asset Portfolio</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {loading ? '—' : `${assets.length} assets`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="glass-card px-4 py-8 text-center">
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
          </div>
        ) : (
          <>
            {/* ── Zone 2: Asset Distribution ── */}
            {assets.length > 0 && (
              <AssetDistribution
                assets={assets}
                activeCategory={activeCategory}
                onCategorySelect={setActiveCategory}
              />
            )}

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

            {assets.length === 0 && (
              <div className="glass-card px-4 py-8 text-center">
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No assets yet</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 6 }}>
                  Tap + ADD to log your first asset
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
