import React from 'react'
import { plants } from '../data/mockData.js'
import { Link } from 'react-router-dom'

function daysUntilWatering(lastWatered, frequencyDays) {
  const last = new Date(lastWatered)
  const next = new Date(last)
  next.setDate(next.getDate() + frequencyDays)
  const today = new Date('2024-01-22')
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  return diff
}

function StatusBadge({ status }) {
  if (status === 'healthy') {
    return <span className="text-xs bg-garden-100 text-garden-700 px-2 py-0.5 rounded-full font-medium">Healthy</span>
  }
  return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Needs Attention</span>
}

function WateringSoonCard({ plant }) {
  const days = daysUntilWatering(plant.lastWatered, plant.wateringFrequencyDays)
  const urgent = days <= 1
  return (
    <div className={`rounded-xl p-4 border ${urgent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{plant.name}</p>
          <p className="text-xs text-gray-500">{plant.location}</p>
        </div>
        <div className="text-right">
          {days <= 0
            ? <p className="text-xs font-bold text-red-600">Water today</p>
            : days === 1
            ? <p className="text-xs font-bold text-blue-600">Tomorrow</p>
            : <p className="text-xs text-gray-500">In {days} days</p>
          }
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const totalPlants = plants.length
  const healthyCount = plants.filter(p => p.healthStatus === 'healthy').length
  const needsAttention = plants.filter(p => p.healthStatus !== 'healthy').length

  const upcomingWatering = [...plants]
    .map(p => ({ ...p, daysUntil: daysUntilWatering(p.lastWatered, p.wateringFrequencyDays) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3)

  const recentActivity = plants
    .flatMap(p => p.wateringSchedules.filter(s => s.completed).map(s => ({ ...s, plantName: p.name })))
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
    .slice(0, 4)

  return (
    <div className="max-w-md mx-auto px-4 pt-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-garden-600 font-medium">Monday, January 22</p>
        <h1 className="text-2xl font-bold text-gray-900">My Garden 🌱</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what needs your attention today</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-garden-700">{totalPlants}</p>
          <p className="text-xs text-gray-500 mt-1">Total Plants</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-garden-700">{healthyCount}</p>
          <p className="text-xs text-gray-500 mt-1">Healthy</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-amber-500">{needsAttention}</p>
          <p className="text-xs text-gray-500 mt-1">Attention</p>
        </div>
      </div>

      {/* Upcoming watering */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Upcoming Watering</h2>
          <Link to="/plants" className="text-xs text-garden-600 font-medium">See all →</Link>
        </div>
        <div className="flex flex-col gap-2">
          {upcomingWatering.map(plant => (
            <WateringSoonCard key={plant.id} plant={plant} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {recentActivity.map(activity => (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">💧</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{activity.plantName}</p>
                  <p className="text-xs text-gray-400">Watered {activity.amount}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{activity.scheduledDate}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}