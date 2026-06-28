import React, { useState, useRef } from 'react'

const EXAMPLES = [
  'Add Rolex Daytona Panda, valued at $42000',
  'Log Hermès Kelly 28 Sellier, $38500',
  'Add Basquiat print, worth $85000',
  'Add vintage 1986 Chanel tote, valued at $4500'
]

export default function QuickTransaction({ onSubmit }) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const inputRef = useRef(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const cyclePlaceholder = () => {
    setExampleIdx(i => (i + 1) % EXAMPLES.length)
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Quick Transaction</p>
        <button
          onClick={cyclePlaceholder}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 10,
            letterSpacing: '0.05em',
            padding: '2px 0',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          EXAMPLE ↻
        </button>
      </div>

      {/* Hint chips */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 12
        }}
      >
        {['Watch', 'Fine Art', 'Fashion'].map(chip => (
          <button
            key={chip}
            onClick={() => {
              const prefixes = {
                'Watch': 'Add ',
                'Fine Art': 'Add ',
                'Fashion': 'Add vintage '
              }
              setValue(prefixes[chip])
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.04em',
              transition: 'background 0.15s ease'
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
        />

        {/* Submit button */}
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{
            position: 'absolute',
            right: 8,
            flexShrink: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="#0a0a12"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Parser hint */}
      <p
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          marginTop: 10,
          lineHeight: 1.5
        }}
      >
        Natural language accepted · Category detected automatically
      </p>
    </div>
  )
}