import React, { useState } from 'react'
import { plants } from '../data/mockData'

function ScheduleBadge({ schedule }) {
  const isComplete = !!schedule.completedAt
  return (
    <div className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
      isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
    }`}>
      <span>{isComplete ? '✅' : '🔔'} {schedule.scheduledDate}</span>
      {schedule.notes ? <span className="text-gray-400 ml-2">{schedule.notes}</span> : null}
    </div>
  )
}

function PlantCard({ plant }) {
  const [expanded, setExpanded] = useState(false)
  const pending = plant.wateringSchedules.filter(ws => !ws.completedAt)
  const history = plant.wateringSchedules.filter(ws => ws.completedAt)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🪴</span>
          <div>
            <p className="font-semibold text-gray-800">{plant.name}</p>
            <p className="text-xs text-gray-400 italic">{plant.species}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {pending.length} due
            </span>
          )}
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm text-gray-700">📍 {plant.location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Frequency</p>
              <p className="text-sm text-gray-700">
                💧 Every {plant.wateringFrequencyDays} {plant.wateringFrequencyDays === 1 ? 'day' : 'days'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Watered</p>
              <p className="text-sm text-gray-700">{plant.lastWatered}</p>
            </div>
          </div>

          {plant.notes && (
            <div className="bg-garden-pale rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700">{plant.notes}</p>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-1">
                {pending.map(ws => (
                  <ScheduleBadge key={ws.id} schedule={ws} />
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">History</p>
              <div className="space-y-1">
                {history.map(ws => (
                  <ScheduleBadge key={ws.id} schedule={ws} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Plants() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Your Plants</h1>
        <p className="text-gray-500 mt-1">{plants.length} plants in your garden</p>
      </div>
      <div className="space-y-3">
        {plants.map(plant => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </div>
  )
}