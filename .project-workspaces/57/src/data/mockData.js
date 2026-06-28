export const plants = [
  {
    id: 1,
    name: 'Monstera Deliciosa',
    species: 'Monstera deliciosa',
    location: 'Living Room',
    wateringFrequencyDays: 7,
    lastWatered: '2024-01-18',
    nextWatering: '2024-01-25',
    health: 'healthy',
    notes: 'Loves indirect sunlight. Wipe leaves monthly.',
    emoji: '🌿'
  },
  {
    id: 2,
    name: 'Fiddle Leaf Fig',
    species: 'Ficus lyrata',
    location: 'Bedroom',
    wateringFrequencyDays: 10,
    lastWatered: '2024-01-15',
    nextWatering: '2024-01-25',
    health: 'needs-attention',
    notes: 'Sensitive to drafts. Keep away from vents.',
    emoji: '🌳'
  },
  {
    id: 3,
    name: 'Pothos',
    species: 'Epipremnum aureum',
    location: 'Kitchen',
    wateringFrequencyDays: 5,
    lastWatered: '2024-01-20',
    nextWatering: '2024-01-25',
    health: 'healthy',
    notes: 'Very forgiving. Can handle low light.',
    emoji: '🍃'
  },
  {
    id: 4,
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    location: 'Office',
    wateringFrequencyDays: 14,
    lastWatered: '2024-01-10',
    nextWatering: '2024-01-24',
    health: 'overdue',
    notes: 'Almost indestructible. Overwatering is main risk.',
    emoji: '🌱'
  },
  {
    id: 5,
    name: 'Peace Lily',
    species: 'Spathiphyllum',
    location: 'Bathroom',
    wateringFrequencyDays: 7,
    lastWatered: '2024-01-19',
    nextWatering: '2024-01-26',
    health: 'healthy',
    notes: 'Loves humidity. Will droop when thirsty.',
    emoji: '🌸'
  }
]

export const wateringSchedules = [
  {
    id: 1,
    plantId: 1,
    scheduledDate: '2024-01-25',
    completedDate: null,
    amountMl: 300,
    notes: 'Check soil moisture first'
  },
  {
    id: 2,
    plantId: 1,
    scheduledDate: '2024-01-18',
    completedDate: '2024-01-18',
    amountMl: 300,
    notes: ''
  },
  {
    id: 3,
    plantId: 1,
    scheduledDate: '2024-01-11',
    completedDate: '2024-01-11',
    amountMl: 250,
    notes: 'Soil was very dry'
  },
  {
    id: 4,
    plantId: 2,
    scheduledDate: '2024-01-25',
    completedDate: null,
    amountMl: 400,
    notes: ''
  },
  {
    id: 5,
    plantId: 2,
    scheduledDate: '2024-01-15',
    completedDate: '2024-01-15',
    amountMl: 400,
    notes: 'Leaves looked a bit droopy'
  },
  {
    id: 6,
    plantId: 3,
    scheduledDate: '2024-01-25',
    completedDate: null,
    amountMl: 200,
    notes: ''
  },
  {
    id: 7,
    plantId: 3,
    scheduledDate: '2024-01-20',
    completedDate: '2024-01-20',
    amountMl: 200,
    notes: ''
  },
  {
    id: 8,
    plantId: 4,
    scheduledDate: '2024-01-24',
    completedDate: null,
    amountMl: 150,
    notes: 'Check for root rot'
  },
  {
    id: 9,
    plantId: 4,
    scheduledDate: '2024-01-10',
    completedDate: '2024-01-10',
    amountMl: 150,
    notes: ''
  },
  {
    id: 10,
    plantId: 5,
    scheduledDate: '2024-01-26',
    completedDate: null,
    amountMl: 250,
    notes: ''
  },
  {
    id: 11,
    plantId: 5,
    scheduledDate: '2024-01-19',
    completedDate: '2024-01-19',
    amountMl: 250,
    notes: ''
  }
]