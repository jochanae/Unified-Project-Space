import React, { useMemo } from 'react'

const CATEGORIES = [
  {
    key: 'Watches',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="7" y="1" width="8" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="7" y="18" width="8" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11 7.5V11l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    shapeClass: 'frosted-shape-watches',
    accentColor: '#fbbf24',
    label: 'WATCHES'
  },
  {
    key: 'Fine Art',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="2" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="15" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    shapeClass: 'frosted-shape-art',
    accentColor: '#a78bfa',
    label: 'FINE ART'
  },
  {
    key: 'Fashion',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M8 2L5 6l-3 2 2 2v8h12v-8l2-2-3-2-3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 2c0 2 1.5 3 3 3s3-1 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    shapeClass: 'frosted-shape-fashion',
    accentColor: '#f472b6',
    label: 'FASHION'
  }
]

function formatShort(value) {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K'
  return '$' + value
}

export default function AssetDistribution({ assets, activeCategory, onCategorySelect }) {
  const categoryData = useMemo(() => {
    const total = assets.reduce((s, a) => s + a.value, 0) || 1
    return CATEGORIES.map(cat => {
      const catAssets = assets.filter(a => a.category === cat.key)
      const value = catAssets.reduce((s, a) => s + a.value, 0)
      const pct = Math.round((value / total) * 100)
      const count = catAssets.length
      return { ...cat, value, pct, count }
    })
  }, [assets])

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Asset Distribution</p>
        {activeCategory && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            tap again to deselect
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {categoryData.map(cat => {
          const isActive = activeCategory === cat.key
          const isInactive = activeCategory && !isActive

          return (
            <button
              key={cat.key}
              className={`category-shape ${cat.shapeClass} rounded-2xl p-3 text-left`}
              onClick={() => onCategorySelect(isActive ? null : cat.key)}
              style={{
                border: `1px solid ${isActive ? cat.accentColor + '55' : undefined}`,
                boxShadow: isActive
                  ? `0 0 20px ${cat.accentColor}18, 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 ${cat.accentColor}22`
                  : undefined,
                opacity: isInactive ? 0.45 : 1,
                cursor: 'pointer',
                background: 'none',
                textAlign: 'left',
                transition: 'opacity 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {/* Icon */}
              <div style={{ color: cat.accentColor, marginBottom: 10, opacity: isInactive ? 0.6 : 1 }}>
                {cat.icon}
              </div>

              {/* Value */}
              <p
                className="value-display"
                style={{
                  fontSize: '1.05rem',
                  color: isActive ? cat.accentColor : '#e8e8f0',
                  lineHeight: 1.1,
                  marginBottom: 4
                }}
              >
                {formatShort(cat.value)}
              </p>

              {/* Percentage bar */}
              <div
                style={{
                  height: 2,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.07)',
                  marginBottom: 6,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${cat.pct}%`,
                    background: cat.accentColor,
                    borderRadius: 2,
                    opacity: 0.7,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              {/* Category label */}
              <p
                className="category-pill"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: cat.accentColor,
                  background: cat.accentColor + '12',
                  display: 'inline-block'
                }}
              >
                {cat.label}
              </p>

              {/* Count */}
              <p
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 4
                }}
              >
                {cat.count} {cat.count === 1 ? 'item' : 'items'} · {cat.pct}%
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}