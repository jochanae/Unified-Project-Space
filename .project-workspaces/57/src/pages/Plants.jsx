import React, { useState } from 'react'
import { plants, wateringSchedules } from '../data/mockData'

function HealthBadge({ health }) {
  const map = {
    healthy: { label: 'Healthy', bg: 'bg-green-100', text: 'text-green-700' },
    'needs-attention': { label: 'Needs Attention', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-700' }
  }
  const style = map[health] || map['healthy']
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function WateringHistory({ plantId }) {
  const history = wateringSchedules
    .filter(s => s.plantId === plantId)
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))

  if (history.length === 0) {
    return <p className="text-xs text-garden-400 italic">No watering history yet.</p>
  }

  return (
    <div className="space-y-1 mt-2">
      {history.map(s => (
        <div key={s.id} className="flex items-center gap-2 text-xs">
          <span>{s.completedDate ? '✅' : '⏳'}</span>
          <span className="text-garden-700 font-medium">{s.scheduledDate}</span>
          <span className="text-garden-500">{s.amountMl}ml</span>
          {s.notes ? <span className="text-garden-400 italic truncate">— {s.notes}</span> : null}
        </div>
      ))}
    </div>
  )
}

function PlantCard({ plant }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-garden-100 rounded-xl overflow-hidden">
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-3xl">{plant.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-garden-800">{plant.name}</p>
          <p className="text-xs text-garden-500 italic">{plant.species}</p>
          <p className="text-xs text-garden-500 mt-0.5">{plant.location}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <HealthBadge health={plant.health} />
          <span className="text-garden-300 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-garden-50">
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-garden-50 rounded-lg p-3">
              <p className="text-xs text-garden-500 mb-1">Watering Frequency</p>
              <p className="font-semibold text-garden-800">Every {plant.wateringFrequencyDays} days</p>
            </div>
            <div className="bg-garden-50 rounded-lg p-3">
              <p className="text-xs text-garden-500 mb-1">Next Watering</p>
              <p className="font-semibold text-garden-800">{plant.nextWatering}</p>
            </div>
          </div>

          {plant.notes && (
            <div className="mt-3 bg-garden-50 rounded-lg p-3">
              <p className="text-xs text-garden-500 mb-1">Care Notes</p>
              <p className="text-sm text-garden-700">{plant.notes}</p>
            </div>
          )}

          <div className="mt-3">
            <p className="text-xs font-semibold text-garden-700 uppercase tracking-wide mb-1">
              Watering History
            </p>
            <WateringHistory plantId={plant.id} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Plants() {
  const [filter, setFilter] = useState('all')

  const filtered = plants.filter(p => {
    if (filter === 'all') return true
    return p.health === filter
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-garden-800">My Plants</h2>
        <span className="text-sm text-garden-500">{plants.length} plants</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'healthy', label: '✅ Healthy' },
          { key: 'needs-attention', label: '⚠️ Attention' },
          { key: 'overdue', label: '🔴 Overdue' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-garden-700 text-white'
                : 'bg-garden-50 text-garden-600 hover:bg-garden-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plant list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-garden-400 text-sm">
            No plants match this filter.
          </div>
        ) : (
          filtered.map(plant => <PlantCard key={plant.id} plant={plant} />)
        )}
      </div>

      {/* Add plant CTA */}
      <button className="w-full py-3 border-2 border-dashed border-garden-200 rounded-xl text-garden-500 text-sm font-medium hover:border-garden-400 hover:text-garden-700 transition-colors">
        + Add New Plant
      </button>
    </div>
  )
}