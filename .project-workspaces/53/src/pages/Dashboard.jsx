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

function WateringTaskCard({ plant }) {
  const [watered, setWatered] = useState(false)
  const activeSchedule = plant.wateringSchedules.find(s => s.isActive)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      watered ? 'bg-garden-50 border-garden-200 opacity-60' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <span className="text-2xl">{plant.imageEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">{plant.name}</p>
        <p className="text-xs text-gray-500">{plant.location} · every {activeSchedule?.frequencyDays}d</p>
      </div>
      <button
        onClick={() => setWatered(!watered)}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
          watered
            ? 'bg-garden-500 border-garden-500 text-white'
            : 'border-gray-300 hover:border-garden-400'
        }`}
        aria-label={watered ? 'Mark as not watered' : 'Mark as watered'}
      >
        {watered && <span className="text-sm">✓</span>}
      </button>
    </div>
  )
}

function StatCard({ label, value, emoji, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-2xl font-bold text-gray-800">{value}</span>
      </div>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const plants = mockPlants
  const healthyCount = plants.filter(p => p.healthStatus === 'healthy').length
  const needsAttentionCount = plants.filter(p => p.healthStatus === 'needs-attention').length
  const wiltingCount = plants.filter(p => p.healthStatus === 'wilting').length
  const urgentPlants = plants.filter(p => p.healthStatus === 'wilting' || p.healthStatus === 'needs-attention')
  const upcomingWatering = plants.filter(p => p.wateringSchedules.some(s => s.isActive))

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Good morning 🌤️</h2>
        <p className="text-gray-500 text-sm mt-1">Here's how your garden is doing today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Healthy" value={healthyCount} emoji="💚" color="bg-garden-50" />
        <StatCard label="Watch" value={needsAttentionCount} emoji="👀" color="bg-yellow-50" />
        <StatCard label="Urgent" value={wiltingCount} emoji="🚨" color="bg-red-50" />
      </div>

      {/* Urgent alerts */}
      {urgentPlants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Needs Your Attention
          </h3>
          <div className="space-y-2">
            {urgentPlants.map(plant => (
              <div key={plant.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-yellow-100 shadow-sm">
                <span className="text-2xl">{plant.imageEmoji}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{plant.name}</p>
                  <p className="text-xs text-gray-500">{plant.location}</p>
                </div>
                <HealthBadge status={plant.healthStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's watering */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Today's Watering
        </h3>
        <div className="space-y-2">
          {upcomingWatering.map(plant => (
            <WateringTaskCard key={plant.id} plant={plant} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-garden-700 text-white rounded-2xl p-4">
        <p className="text-sm font-medium opacity-80 mb-1">Total Plants</p>
        <p className="text-3xl font-bold">{plants.length}</p>
        <p className="text-sm opacity-70 mt-1">{healthyCount} thriving · {plants.reduce((acc, p) => acc + p.wateringSchedules.length, 0)} active schedules</p>
      </div>
    </div>
  )
}