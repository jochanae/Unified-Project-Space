export const mockPlants = [
  {
    id: '1',
    name: 'Monstera Deliciosa',
    species: 'Monstera deliciosa',
    location: 'Living Room',
    healthStatus: 'healthy',
    lastWatered: '2024-01-14',
    imageEmoji: '🌿',
    notes: 'Thriving near the east window. New leaf unfurling.',
    wateringSchedules: [
      {
        id: 'ws1',
        plantId: '1',
        label: 'Summer Schedule',
        frequencyDays: 7,
        preferredTime: '08:00',
        isActive: true,
        season: 'summer'
      },
      {
        id: 'ws2',
        plantId: '1',
        label: 'Winter Schedule',
        frequencyDays: 14,
        preferredTime: '09:00',
        isActive: false,
        season: 'winter'
      }
    ]
  },
  {
    id: '2',
    name: 'Fiddle Leaf Fig',
    species: 'Ficus lyrata',
    location: 'Office',
    healthStatus: 'needs-attention',
    lastWatered: '2024-01-10',
    imageEmoji: '🌳',
    notes: 'Some browning on lower leaves. May need more humidity.',
    wateringSchedules: [
      {
        id: 'ws3',
        plantId: '2',
        label: 'Regular',
        frequencyDays: 10,
        preferredTime: '07:30',
        isActive: true,
        season: 'all'
      }
    ]
  },
  {
    id: '3',
    name: 'Pothos',
    species: 'Epipremnum aureum',
    location: 'Bedroom',
    healthStatus: 'healthy',
    lastWatered: '2024-01-15',
    imageEmoji: '🍃',
    notes: 'Fast grower. Trails beautifully from the shelf.',
    wateringSchedules: [
      {
        id: 'ws4',
        plantId: '3',
        label: 'Weekly',
        frequencyDays: 7,
        preferredTime: '10:00',
        isActive: true,
        season: 'all'
      }
    ]
  },
  {
    id: '4',
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    location: 'Hallway',
    healthStatus: 'healthy',
    lastWatered: '2024-01-08',
    imageEmoji: '🌱',
    notes: 'Very low maintenance. Tolerates low light well.',
    wateringSchedules: [
      {
        id: 'ws5',
        plantId: '4',
        label: 'Bi-weekly',
        frequencyDays: 14,
        preferredTime: '11:00',
        isActive: true,
        season: 'all'
      },
      {
        id: 'ws6',
        plantId: '4',
        label: 'Winter Drought',
        frequencyDays: 30,
        preferredTime: '11:00',
        isActive: false,
        season: 'winter'
      }
    ]
  },
  {
    id: '5',
    name: 'Peace Lily',
    species: 'Spathiphyllum wallisii',
    location: 'Bathroom',
    healthStatus: 'wilting',
    lastWatered: '2024-01-07',
    imageEmoji: '🌸',
    notes: 'Drooping slightly. Needs water soon.',
    wateringSchedules: [
      {
        id: 'ws7',
        plantId: '5',
        label: 'Twice Weekly',
        frequencyDays: 3,
        preferredTime: '08:00',
        isActive: true,
        season: 'all'
      }
    ]
  }
]

export const mockSettings = {
  userName: 'Garden Keeper',
  notifications: true,
  morningReminder: '08:00',
  units: 'metric',
  theme: 'light',
  weekStartsOn: 'monday'
}