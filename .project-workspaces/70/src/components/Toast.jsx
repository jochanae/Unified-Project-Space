import React from 'react'

export default function Toast({ message, type }) {
  const isSuccess = type === 'success'

  return (
    <div
      className="toast"
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderRadius: 14,
        background: isSuccess
          ? 'rgba(10, 20, 12, 0.92)'
          : 'rgba(20, 8, 8, 0.92)',
        border: isSuccess
          ? '1px solid rgba(52, 211, 153, 0.25)'
          : '1px solid rgba(248, 113, 113, 0.25)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isSuccess
          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.08) inset'
          : '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(248,113,113,0.08) inset',
        maxWidth: 'calc(100vw - 48px)',
        whiteSpace: 'nowrap'
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: isSuccess ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {isSuccess ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2L2 8" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Message */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isSuccess ? '#a7f3d0' : '#fca5a5',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {message}
      </span>
    </div>
  )
}