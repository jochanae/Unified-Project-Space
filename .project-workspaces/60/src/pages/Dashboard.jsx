import React from 'react'
import { Link } from 'react-router-dom'
import { plants, getPendingWaterings } from '../data/mockData'

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`rounded-2xl p-5 ${color} flex items-center gap-4`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  )
}

function WateringItem({ schedule }) {
  const isOverdue = new Date(schedule.scheduledDate) < new Date()
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl">💧</span>
        <div>
          <p className="font-medium text-gray-800">{schedule.plantName}</p>
          <p className="text-xs text-gray-500">{schedule.plantLocation}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          isOverdue ? 'bg-red-100 text-red-700' : 'bg-garden-pale text-garden-green'
        }`}>
          {isOverdue ? 'Overdue' : 'Due today'}
        </span>
        <p className="text-xs text-gray-400 mt-1">{schedule.scheduledDate}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const pending = getPendingWaterings()
  const totalSchedules = plants.reduce((acc, p) => acc + p.wateringSchedules.length, 0)
  const completed = plants.reduce(
    (acc, p) => acc + p.wateringSchedules.filter(ws => ws.completedAt).length,
    0
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Good morning 🌤️</h1>
        <p className="text-gray-500 mt-1">Here's what needs attention today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total plants" value={plants.length} icon="🪴" color="bg-garden-pale" />
        <StatCard label="Waterings due" value={pending.length} icon="💧" color="bg-sky-100" />
        <StatCard label="Completed this week" value={completed} icon="✅" color="bg-emerald-50" />
      </div>

      {/* Pending waterings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Upcoming Waterings</h2>
          <Link to="/plants" className="text-sm text-garden-green hover:underline">
            View all plants →
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <span className="text-4xl block mb-2">🎉</span>
            All plants are watered. Nothing due right now.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(ws => (
              <WateringItem key={ws.id} schedule={ws} />
            ))}
          </div>
        )}
      </div>

      {/* Quick plant list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Your Garden</h2>
        <div className="grid grid-cols-2 gap-3">
          {plants.map(plant => (
            <div key={plant.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="font-semibold text-gray-800">{plant.name}</p>
              <p className="text-xs text-gray-400 italic">{plant.species}</p>
              <p className="text-xs text-gray-500 mt-1">📍 {plant.location}</p>
              <p className="text-xs text-garden-green mt-1">
                💧 Every {plant.wateringFrequencyDays} {plant.wateringFrequencyDays === 1 ? 'day' : 'days'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}