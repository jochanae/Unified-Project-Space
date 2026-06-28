import React, { useState } from 'react'
import { plants as initialPlants } from '../data/mockData.js'

function healthColor(status) {
  return status === 'healthy'
    ? 'bg-garden-100 text-garden-700'
    : 'bg-amber-100 text-amber-700'
}

function daysUntilWatering(lastWatered, frequencyDays) {
  const last = new Date(lastWatered)
  const next = new Date(last)
  next.setDate(next.getDate() + frequencyDays)
  const today = new Date('2024-01-22')
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  return diff
}

function WateringScheduleList({ schedules }) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Watering Schedule</p>
      <div className="flex flex-col gap-1">
        {schedules.slice(0, 3).map(s => (
          <div key={s.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span>{s.completed ? '✅' : '🗓️'}</span>
              <span className="text-gray-600">{s.scheduledDate}</span>
            </div>
            <span className={`font-medium ${s.completed ? 'text-gray-400' : 'text-blue-600'}`}>
              {s.amount} {s.completed ? '· done' : '· upcoming'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlantCard({ plant }) {
  const [expanded, setExpanded] = useState(false)
  const days = daysUntilWatering(plant.lastWatered, plant.wateringFrequencyDays)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm">{plant.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthColor(plant.healthStatus)}`}>
              {plant.healthStatus === 'healthy' ? 'Healthy' : 'Attention'}
            </span>
          </div>
          <p className="text-xs text-gray-400 italic mb-1">{plant.species}</p>
          <p className="text-xs text-gray-500">📍 {plant.location}</p>
        </div>
        <div className="text-right ml-3">
          <p className="text-xs text-gray-400">Next water</p>
          <p className={`text-sm font-bold ${days <= 0 ? 'text-red-600' : days === 1 ? 'text-blue-600' : 'text-gray-700'}`}>
            {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
          </p>
        </div>
      </div>

      {plant.notes && (
        <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">{plant.notes}</p>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-garden-600 font-medium"
      >
        {expanded ? 'Hide schedule ↑' : 'Show schedule ↓'}
      </button>

      {expanded && <WateringScheduleList schedules={plant.wateringSchedules} />}
    </div>
  )
}

export default function Plants() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = initialPlants.filter(p => {
    const matchesFilter = filter === 'all' || p.healthStatus === filter
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="max-w-md mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Plants 🪴</h1>
        <button className="bg-garden-600 text-white text-sm font-medium px-4 py-2 rounded-full">
          + Add Plant
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or location…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-garden-400"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'healthy', 'needs-attention'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-garden-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'needs-attention' ? 'Needs Attention' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">{filtered.length} plant{filtered.length !== 1 ? 's' : ''}</p>

      {/* Plant list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🌱</p>
              <p className="text-sm">No plants found</p>
            </div>
          : filtered.map(plant => <PlantCard key={plant.id} plant={plant} />)
        }
      </div>
    </div>
  )
}