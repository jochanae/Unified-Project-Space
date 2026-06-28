import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast.jsx'

const EXAMPLES = [
  'Add Rolex Daytona Panda, valued at $42000',
  'Log Hermès Kelly 28 Sellier, $38500',
  'Add Basquiat print, worth $85000',
  'Add vintage 1986 Chanel tote, valued at $4500'
]

// ── Natural language parser ──────────────────────────────────────────────────
function parseTransaction(text) {
  const lower = text.toLowerCase()

  let category = 'Fine Art'
  if (/watch|rolex|patek|audemars|richard mille|ap |omega|cartier tank|chronograph/i.test(text)) {
    category = 'Watches'
  } else if (/bag|handbag|tote|chanel|hermès|hermes|birkin|kelly|louis vuitton|gucci|prada|dior|fashion|clothing|jacket|coat|dress|shoe|sneaker|boots/i.test(text)) {
    category = 'Fashion'
  } else if (/art|painting|sculpture|print|canvas|drawing|photograph|basquiat|kaws|hirst|murakami/i.test(text)) {
    category = 'Fine Art'
  }

  let valueCents = 0
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
      let v = parseFloat(raw)
      if (pattern.source.includes('k')) v *= 1000
      valueCents = Math.round(v * 100)
      break
    }
  }

  let name = text
    .replace(/^(?:add|log|record|new|track)\s+/i, '')
    .replace(/,?\s*valued?\s+at\s+\$?[\d,k.]+/i, '')
    .replace(/,?\s*(?:worth|cost|price|priced\s+at)\s+\$?[\d,k.]+/i, '')
    .replace(/\$\s*[\d,k.]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  name = name.replace(/\b\w/g, c => c.toUpperCase())
  if (!name) name = 'New Asset'

  return { name, category, valueCents }
}

export default function AddPage() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || submitting) return

    const parsed = parseTransaction(trimmed)
    if (parsed.valueCents === 0) {
      showToast('Include a value — e.g. "valued at $4500"', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/ledger/assets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.name,
          category: parsed.category,
          valueCents: parsed.valueCents,
          notes: 'Added via Quick Transaction',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Server error')
      }
      setValue('')
      showToast(`${parsed.name} added to ledger`, 'success')
      setTimeout(() => navigate('/assets'), 1200)
    } catch (err) {
      showToast(err.message ?? 'Failed to add asset', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="obsidian-bg min-h-dvh">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-6 safe-bottom flex flex-col gap-5">

        <div className="pt-2">
          <p className="section-label" style={{ letterSpacing: '0.18em' }}>Quick Transaction</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Natural language · Category detected automatically
          </p>
        </div>

        {/* ── Zone 3: Transaction Input ── */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Add Asset</p>
            <button
              onClick={() => setExampleIdx(i => (i + 1) % EXAMPLES.length)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.25)', fontSize: 10,
                letterSpacing: '0.05em', padding: '2px 0', fontFamily: 'Inter, sans-serif'
              }}
            >
              EXAMPLE ↻
            </button>
          </div>

          {/* Hint chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['Watch', 'Fine Art', 'Fashion'].map(chip => (
              <button
                key={chip}
                onClick={() => { setValue('Add '); setTimeout(() => inputRef.current?.focus(), 0) }}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: '4px 10px', fontSize: 10,
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em'
                }}
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              ref={inputRef}
              className="transaction-input"
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={EXAMPLES[exampleIdx]}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              disabled={submitting}
            />
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!value.trim() || submitting}
              style={{ position: 'absolute', right: 8, flexShrink: 0 }}
            >
              {submitting ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="#0a0a12" strokeWidth="2" strokeDasharray="20 16"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#0a0a12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 10, lineHeight: 1.5 }}>
            Natural language accepted · Category detected automatically
          </p>
        </div>

        {/* Preview parse */}
        {value.trim().length > 8 && (() => {
          const p = parseTransaction(value.trim())
          if (!p.valueCents) return null
          return (
            <div className="glass-card px-4 py-3" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
              <p className="section-label mb-2">Preview</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, color: '#e8e8f0', fontWeight: 500 }}>{p.name}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.category}</p>
                </div>
                <span className="value-display amber-glow" style={{ fontSize: '1.1rem' }}>
                  ${(p.valueCents / 100).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          )
        })()}

      </div>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
