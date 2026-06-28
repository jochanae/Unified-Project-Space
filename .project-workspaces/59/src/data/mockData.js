export const plants = [
  {
    id: 1,
    name: 'Monstera Deliciosa',
    species: 'Monstera deliciosa',
    location: 'Living Room',
    wateringFrequencyDays: 7,
    lastWatered: '2024-01-18',
    healthStatus: 'healthy',
    notes: 'Loves indirect bright light. Wipe leaves monthly.',
    wateringSchedules: [
      { id: 101, plantId: 1, scheduledDate: '2024-01-25', completed: false, amount: '500ml' },
      { id: 102, plantId: 1, scheduledDate: '2024-01-18', completed: true, amount: '500ml' },
      { id: 103, plantId: 1, scheduledDate: '2024-01-11', completed: true, amount: '450ml' }
    ]
  },
  {
    id: 2,
    name: 'Fiddle Leaf Fig',
    species: 'Ficus lyrata',
    location: 'Bedroom',
    wateringFrequencyDays: 10,
    lastWatered: '2024-01-15',
    healthStatus: 'needs-attention',
    notes: 'Sensitive to drafts. Keep away from AC vents.',
    wateringSchedules: [
      { id: 201, plantId: 2, scheduledDate: '2024-01-25', completed: false, amount: '600ml' },
      { id: 202, plantId: 2, scheduledDate: '2024-01-15', completed: true, amount: '600ml' },
      { id: 203, plantId: 2, scheduledDate: '2024-01-05', completed: true, amount: '550ml' }
    ]
  },
  {
    id: 3,
    name: 'Pothos',
    species: 'Epipremnum aureum',
    location: 'Kitchen',
    wateringFrequencyDays: 5,
    lastWatered: '2024-01-20',
    healthStatus: 'healthy',
    notes: 'Very forgiving. Tolerates low light well.',
    wateringSchedules: [
      { id: 301, plantId: 3, scheduledDate: '2024-01-25', completed: false, amount: '250ml' },
      { id: 302, plantId: 3, scheduledDate: '2024-01-20', completed: true, amount: '250ml' },
      { id: 303, plantId: 3, scheduledDate: '2024-01-15', completed: true, amount: '200ml' }
    ]
  },
  {
    id: 4,
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    location: 'Office',
    wateringFrequencyDays: 14,
    lastWatered: '2024-01-10',
    healthStatus: 'healthy',
    notes: 'Nearly indestructible. Water sparingly in winter.',
    wateringSchedules: [
      { id: 401, plantId: 4, scheduledDate: '2024-01-24', completed: false, amount: '200ml' },
      { id: 402, plantId: 4, scheduledDate: '2024-01-10', completed: true, amount: '200ml' },
      { id: 403, plantId: 4, scheduledDate: '2023-12-27', completed: true, amount: '180ml' }
    ]
  },
  {
    id: 5,
    name: 'Peace Lily',
    species: 'Spathiphyllum wallisii',
    location: 'Bathroom',
    wateringFrequencyDays: 7,
    lastWatered: '2024-01-19',
    healthStatus: 'healthy',
    notes: 'Droops dramatically when thirsty — very obvious signal.',
    wateringSchedules: [
      { id: 501, plantId: 5, scheduledDate: '2024-01-26', completed: false, amount: '300ml' },
      { id: 502, plantId: 5, scheduledDate: '2024-01-19', completed: true, amount: '300ml' },
      { id: 503, plantId: 5, scheduledDate: '2024-01-12', completed: true, amount: '280ml' }
    ]
  }
]

export const settings = {
  gardenName: 'My Garden',
  ownerName: 'Garden Owner',
  reminderTime: '08:00',
  reminderEnabled: true,
  wateringUnit: 'ml',
  temperatureUnit: 'celsius',
  notifications: {
    wateringReminders: true,
    healthAlerts: true,
    weeklyDigest: false
  }
}