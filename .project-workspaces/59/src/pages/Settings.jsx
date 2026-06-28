import React, { useState } from 'react'
import { settings as initialSettings } from '../data/mockData.js'

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-garden-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">{title}</p>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-gray-700">{label}</p>
      <div>{children}</div>
    </div>
  )
}

export default function Settings() {
  const [config, setConfig] = useState(initialSettings)

  function updateNotification(key, value) {
    setConfig(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings ⚙️</h1>

      <Section title="Garden">
        <Row label="Garden Name">
          <input
            value={config.gardenName}
            onChange={e => setConfig(prev => ({ ...prev, gardenName: e.target.value }))}
            className="text-sm text-right text-garden-700 font-medium bg-transparent focus:outline-none w-36"
          />
        </Row>
        <Row label="Owner Name">
          <input
            value={config.ownerName}
            onChange={e => setConfig(prev => ({ ...prev, ownerName: e.target.value }))}
            className="text-sm text-right text-garden-700 font-medium bg-transparent focus:outline-none w-36"
          />
        </Row>
      </Section>

      <Section title="Watering">
        <Row label="Reminder Time">
          <input
            type="time"
            value={config.reminderTime}
            onChange={e => setConfig(prev => ({ ...prev, reminderTime: e.target.value }))}
            className="text-sm text-garden-700 font-medium bg-transparent focus:outline-none"
          />
        </Row>
        <Row label="Daily Reminders">
          <Toggle
            enabled={config.reminderEnabled}
            onChange={v => setConfig(prev => ({ ...prev, reminderEnabled: v }))}
          />
        </Row>
        <Row label="Volume Unit">
          <select
            value={config.wateringUnit}
            onChange={e => setConfig(prev => ({ ...prev, wateringUnit: e.target.value }))}
            className="text-sm text-garden-700 font-medium bg-transparent focus:outline-none"
          >
            <option value="ml">ml</option>
            <option value="oz">oz</option>
            <option value="cups">cups</option>
          </select>
        </Row>
      </Section>

      <Section title="Notifications">
        <Row label="Watering Reminders">
          <Toggle
            enabled={config.notifications.wateringReminders}
            onChange={v => updateNotification('wateringReminders', v)}
          />
        </Row>
        <Row label="Health Alerts">
          <Toggle
            enabled={config.notifications.healthAlerts}
            onChange={v => updateNotification('healthAlerts', v)}
          />
        </Row>
        <Row label="Weekly Digest">
          <Toggle
            enabled={config.notifications.weeklyDigest}
            onChange={v => updateNotification('weeklyDigest', v)}
          />
        </Row>
      </Section>

      <Section title="Display">
        <Row label="Temperature Unit">
          <select
            value={config.temperatureUnit}
            onChange={e => setConfig(prev => ({ ...prev, temperatureUnit: e.target.value }))}
            className="text-sm text-garden-700 font-medium bg-transparent focus:outline-none"
          >
            <option value="celsius">°C</option>
            <option value="fahrenheit">°F</option>
          </select>
        </Row>
      </Section>

      <div className="py-4 text-center">
        <p className="text-xs text-gray-300">SmartGarden v0.1.0</p>
      </div>
    </div>
  )
}