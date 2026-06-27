import React, { useState } from 'react'
import { mockPlants } from '../data/mockData'

function HealthBadge({ status }) {
  const config = {
    healthy: { label: 'Healthy', classes: 'bg-garden-100 text-garden-700' },
    'needs-attention': { label: 'Needs Attention', classes: 'bg-yellow-100 text-yellow-700' },
    wilting: { label: 'Wilting', classes: 'bg-red-100 text-red-700' }
  }
  const { label, classes } = config[status] || config.healthy
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  )
}

function ScheduleTag({ schedule }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
      schedule.isActive
        ? 'bg-garden-50 border-garden-200 text-garden-700'
        : 'bg-gray-50 border-gray-200 text-gray-400'
    }`}>
      💧 {schedule.label} · every {schedule.frequencyDays}d
      {!schedule.isActive && ' (inactive)'}
    </span>
  )
}

function PlantCard({ plant, onSelect }) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-garden-200 transition-all"
      onClick={() => onSelect(plant)}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-garden-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {plant.imageEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 text-sm leading-tight">{plant.name}</h3>
            <HealthBadge status={plant.healthStatus} />
          </div>
          <p className="text-xs text-gray-400 italic mb-2">{plant.species}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <span>📍</span>
            <span>{plant.location}</span>
            <span className="mx-1">·</span>
            <span>💧 {plant.lastWatered}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {plant.wateringSchedules.map(s => (
              <ScheduleTag key={s.id} schedule={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlantDetail({ plant, onClose }) {
  const activeSchedules = plant.wateringSchedules.filter(s => s.isActive)
  const inactiveSchedules = plant.wateringSchedules.filter(s => !s.isActive)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-garden-50 rounded-2xl flex items-center justify-center text-3xl">
            {plant.imageEmoji}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{plant.name}</h2>
            <p className="text-sm text-gray-400 italic">{plant.species}</p>
            <p className="text-sm text-gray-500 mt-1">📍 {plant.location}</p>
          </div>
        </div>

        {/* Health */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Health Status</h3>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <div className={`w-2 h-2 rounded-full ${
              plant.healthStatus === 'healthy' ? 'bg-garden-500' :
              plant.healthStatus === 'needs-attention' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-700 capitalize">{plant.healthStatus.replace('-', ' ')}</span>
            <span className="text-sm text-gray-400 ml-auto">Last watered {plant.lastWatered}</span>
          </div>
        </div>

        {/* Notes */}
        {plant.notes && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed">{plant.notes}</p>
          </div>
        )}

        {/* Watering Schedules */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Watering Schedules ({plant.wateringSchedules.length})
          </h3>
          <div className="space-y-2">
            {plant.wateringSchedules.map(schedule => (
              <div
                key={schedule.id}
                className={`p-3 rounded-xl border ${
                  schedule.isActive
                    ? 'bg-garden-50 border-garden-200'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{schedule.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    schedule.isActive ? 'bg-garden-200 text-garden-800' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>💧 Every {schedule.frequencyDays} days</span>
                  <span>⏰ {schedule.preferredTime}</span>
                  {schedule.season !== 'all' && <span>🌤️ {schedule.season}</span>}
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-3 py-2.5 border-2 border-dashed border-garden-200 rounded-xl text-sm text-garden-600 font-medium hover:bg-garden-50 transition-colors">
            + Add Schedule
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-garden-600 text-white rounded-xl font-semibold text-sm hover:bg-garden-700 transition-colors">
            💧 Water Now
          </button>
          <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
            ✏️ Edit Plant
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Plants() {
  const [plants] = useState(mockPlants)
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'healthy', label: '💚 Healthy' },
    { key: 'needs-attention', label: '👀 Watch' },
    { key: 'wilting', label: '🚨 Urgent' }
  ]

  const filtered = plants.filter(p => {
    const matchesFilter = filter === 'all' || p.healthStatus === filter
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Plants</h2>
          <p className="text-sm text-gray-500">{plants.length} plants in your garden</p>
        </div>
        <button className="w-10 h-10 bg-garden-600 text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-garden-700 transition-colors text-xl font-bold">
          +
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search plants or locations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-garden-400 focus:ring-1 focus:ring-garden-200"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-garden-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-garden-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Plant list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🌵</p>
            <p className="font-medium">No plants found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map(plant => (
            <PlantCard key={plant.id} plant={plant} onSelect={setSelectedPlant} />
          ))
        )}
      </div>

      {/* Plant detail modal */}
      {selectedPlant && (
        <PlantDetail plant={selectedPlant} onClose={() => setSelectedPlant(null)} />
      )}
    </div>
  )
}