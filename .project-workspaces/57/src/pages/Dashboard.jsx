import React from 'react'
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

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="bg-garden-50 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-garden-600 font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <span className="text-2xl font-bold text-garden-800">{value}</span>
      {sub && <span className="text-xs text-garden-500">{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const today = '2024-01-25'

  const dueToday = wateringSchedules.filter(
    s => s.scheduledDate === today && !s.completedDate
  )

  const overdueCount = plants.filter(p => p.health === 'overdue').length
  const attentionCount = plants.filter(p => p.health === 'needs-attention').length
  const healthyCount = plants.filter(p => p.health === 'healthy').length

  const duePlants = dueToday.map(schedule => {
    const plant = plants.find(p => p.id === schedule.plantId)
    return { ...schedule, plant }
  })

  return (
    <div className="p-4 space-y-6">
      {/* Date */}
      <div>
        <p className="text-sm text-garden-500">Thursday, January 25</p>
        <h2 className="text-xl font-bold text-garden-800">Good morning 🌤️</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Plants" value={plants.length} icon="🌿" sub="in your garden" />
        <StatCard label="Due Today" value={dueToday.length} icon="💧" sub="need watering" />
        <StatCard label="Healthy" value={healthyCount} icon="✅" sub="doing great" />
        <StatCard label="Need Attention" value={overdueCount + attentionCount} icon="⚠️" sub="check on these" />
      </div>

      {/* Due Today */}
      <div>
        <h3 className="text-sm font-semibold text-garden-700 uppercase tracking-wide mb-3">
          Water Today
        </h3>
        {duePlants.length === 0 ? (
          <div className="text-center py-6 text-garden-400 text-sm">
            All caught up! Nothing to water today. 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {duePlants.map(({ id, plant, amountMl, notes }) => (
              <div
                key={id}
                className="bg-white border border-garden-100 rounded-xl p-3 flex items-center gap-3"
              >
                <span className="text-2xl">{plant?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-garden-800 truncate">{plant?.name}</p>
                  <p className="text-xs text-garden-500">{plant?.location} · {amountMl}ml</p>
                  {notes ? <p className="text-xs text-garden-400 mt-0.5 italic">{notes}</p> : null}
                </div>
                <HealthBadge health={plant?.health} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Plants Quick View */}
      <div>
        <h3 className="text-sm font-semibold text-garden-700 uppercase tracking-wide mb-3">
          Garden Status
        </h3>
        <div className="space-y-2">
          {plants.map(plant => (
            <div
              key={plant.id}
              className="bg-white border border-garden-100 rounded-xl p-3 flex items-center gap-3"
            >
              <span className="text-2xl">{plant.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-garden-800 truncate">{plant.name}</p>
                <p className="text-xs text-garden-500">{plant.location} · Next: {plant.nextWatering}</p>
              </div>
              <HealthBadge health={plant.health} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}