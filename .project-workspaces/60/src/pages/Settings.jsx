import React, { useState } from 'react'

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-6">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-garden-green' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const [notifications, setNotifications] = useState(true)
  const [morningReminder, setMorningReminder] = useState(true)
  const [overdueAlerts, setOverdueAlerts] = useState(true)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [units, setUnits] = useState('metric')
  const [theme, setTheme] = useState('light')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your garden preferences.</p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide pt-4 pb-2">Notifications</p>
        <SettingRow
          label="Enable notifications"
          description="Get reminded when plants need watering"
        >
          <Toggle value={notifications} onChange={setNotifications} />
        </SettingRow>
        <SettingRow
          label="Morning reminder"
          description="Daily summary of today's waterings"
        >
          <Toggle value={morningReminder} onChange={setMorningReminder} />
        </SettingRow>
        <SettingRow
          label="Overdue alerts"
          description="Alert when a watering is past due"
        >
          <Toggle value={overdueAlerts} onChange={setOverdueAlerts} />
        </SettingRow>
        <SettingRow
          label="Reminder time"
          description="When to send your morning reminder"
        >
          <input
            type="time"
            value={reminderTime}
            onChange={e => setReminderTime(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-garden-green"
          />
        </SettingRow>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide pt-4 pb-2">Preferences</p>
        <SettingRow
          label="Measurement units"
          description="Used for soil moisture and rainfall"
        >
          <select
            value={units}
            onChange={e => setUnits(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-garden-green"
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </SettingRow>
        <SettingRow
          label="Theme"
          description="App appearance"
        >
          <select
            value={theme}
            onChange={e => setTheme(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-garden-green"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide pt-4 pb-2">About</p>
        <SettingRow label="Version" description="SmartGarden app version">
          <span className="text-sm text-gray-400">1.0.0</span>
        </SettingRow>
        <SettingRow label="Plants tracked" description="Total plants in your garden">
          <span className="text-sm font-medium text-garden-green">4</span>
        </SettingRow>
      </div>
    </div>
  )
}