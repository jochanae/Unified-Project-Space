export const plants = [
  {
    id: 1,
    name: 'Basil',
    species: 'Ocimum basilicum',
    location: 'Kitchen windowsill',
    wateringFrequencyDays: 2,
    lastWatered: '2024-01-12',
    notes: 'Prefers full sun. Pinch flowers to keep bushy.',
    wateringSchedules: [
      { id: 1, plantId: 1, scheduledDate: '2024-01-14', completedAt: null, notes: 'Morning watering' },
      { id: 2, plantId: 1, scheduledDate: '2024-01-12', completedAt: '2024-01-12T08:30:00Z', notes: '' },
      { id: 3, plantId: 1, scheduledDate: '2024-01-10', completedAt: '2024-01-10T09:00:00Z', notes: '' }
    ]
  },
  {
    id: 2,
    name: 'Monstera',
    species: 'Monstera deliciosa',
    location: 'Living room',
    wateringFrequencyDays: 7,
    lastWatered: '2024-01-08',
    notes: 'Indirect light. Allow soil to dry between waterings.',
    wateringSchedules: [
      { id: 4, plantId: 2, scheduledDate: '2024-01-15', completedAt: null, notes: 'Check soil moisture first' },
      { id: 5, plantId: 2, scheduledDate: '2024-01-08', completedAt: '2024-01-08T10:00:00Z', notes: '' },
      { id: 6, plantId: 2, scheduledDate: '2024-01-01', completedAt: '2024-01-01T10:15:00Z', notes: '' }
    ]
  },
  {
    id: 3,
    name: 'Cherry Tomatoes',
    species: 'Solanum lycopersicum',
    location: 'Back patio',
    wateringFrequencyDays: 1,
    lastWatered: '2024-01-13',
    notes: 'Heavy feeder. Water at base, not leaves.',
    wateringSchedules: [
      { id: 7, plantId: 3, scheduledDate: '2024-01-14', completedAt: null, notes: 'Daily watering' },
      { id: 8, plantId: 3, scheduledDate: '2024-01-13', completedAt: '2024-01-13T07:45:00Z', notes: '' },
      { id: 9, plantId: 3, scheduledDate: '2024-01-12', completedAt: '2024-01-12T07:50:00Z', notes: '' }
    ]
  },
  {
    id: 4,
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    location: 'Bedroom',
    wateringFrequencyDays: 14,
    lastWatered: '2024-01-05',
    notes: 'Very drought tolerant. Overwatering is the main risk.',
    wateringSchedules: [
      { id: 10, plantId: 4, scheduledDate: '2024-01-19', completedAt: null, notes: '' },
      { id: 11, plantId: 4, scheduledDate: '2024-01-05', completedAt: '2024-01-05T11:00:00Z', notes: '' }
    ]
  }
]

export const getPlantById = (id) => plants.find(p => p.id === id)

export const getPendingWaterings = () =>
  plants.flatMap(plant =>
    plant.wateringSchedules
      .filter(ws => !ws.completedAt)
      .map(ws => ({ ...ws, plantName: plant.name, plantLocation: plant.location }))
  )