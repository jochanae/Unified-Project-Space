import React, { useMemo } from 'react'

export default function SparklineChart({ data, isUp }) {
  const width = 500
  const height = 56
  const padding = { top: 4, bottom: 4, left: 0, right: 0 }

  const points = useMemo(() => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    return data.map((v, i) => ({
      x: padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right),
      y: padding.top + (1 - (v - min) / range) * (height - padding.top - padding.bottom)
    }))
  }, [data])

  // Build smooth SVG path using cubic bezier curves
  const linePath = useMemo(() => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
    return d
  }, [points])

  // Area fill path (close at bottom)
  const areaPath = useMemo(() => {
    if (!linePath) return ''
    const last = points[points.length - 1]
    const first = points[0]
    return `${linePath} L ${last.x},${height} L ${first.x},${height} Z`
  }, [linePath, points, height])

  const strokeColor = isUp ? '#34d399' : '#f87171'
  const fillStart = isUp ? 'rgba(52, 211, 153, 0.18)' : 'rgba(248, 113, 113, 0.18)'
  const fillEnd = isUp ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)'

  // Last data point dot
  const lastPoint = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor={fillEnd} />
        </linearGradient>
        <filter id="lineglow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill="url(#sparkAreaGrad)" />

      {/* Line */}
      <path
        d={linePath}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lineglow)"
      />

      {/* Last point dot */}
      {lastPoint && (
        <>
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={strokeColor} opacity="0.25" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={strokeColor} />
        </>
      )}
    </svg>
  )
}