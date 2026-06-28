import React, { useState } from 'react'

function ToggleSetting({ label, description, defaultOn }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-garden-800">{label}</p>
        {description && <p className="text-xs text-garden-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          on ? 'bg-garden-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
            on ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function SelectSetting({ label, description, options, defaultValue }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-garden-800">{label}</p>
        {description && <p className="text-xs text-garden-500 mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        className="text-sm border border-garden-200 rounded-lg px-2 py-1 text-garden-700 bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-garden-100 overflow-hidden">
      <div className="px-4 py-3 bg-garden-50 border-b border-garden-100">
        <h3 className="text-xs font-semibold text-garden-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 divide-y divide-garden-50">
        {children}
      </div>
    </div>
  )
}

export default function Settings() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-garden-800">Settings</h2>

      <Section title="Notifications">
        <ToggleSetting
          label="Watering Reminders"
          description="Get notified when plants are due for watering"
          defaultOn={true}
        />
        <ToggleSetting
          label="Overdue Alerts"
          description="Alert when a plant is past its scheduled watering"
          defaultOn={true}
        />
        <ToggleSetting
          label="Weekly Summary"
          description="Receive a weekly garden health report"
          defaultOn={false}
        />
      </Section>

      <Section title="Watering Defaults">
        <SelectSetting
          label="Default Water Amount"
          description="Used when adding a new watering schedule"
          options={[
            { value: '100', label: '100 ml' },
            { value: '200', label: '200 ml' },
            { value: '300', label: '300 ml' },
            { value: '500', label: '500 ml' }
          ]}
          defaultValue="200"
        />
        <SelectSetting
          label="Default Frequency"
          description="How often new plants are watered by default"
          options={[
            { value: '3', label: 'Every 3 days' },
            { value: '7', label: 'Every week' },
            { value: '10', label: 'Every 10 days' },
            { value: '14', label: 'Every 2 weeks' }
          ]}
          defaultValue="7"
        />
      </Section>

      <Section title="Display">
        <ToggleSetting
          label="Show Species Names"
          description="Display scientific species names on plant cards"
          defaultOn={true}
        />
        <SelectSetting
          label="Date Format"
          options={[
            { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
            { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
            { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' }
          ]}
          defaultValue="yyyy-mm-dd"
        />
      </Section>

      <Section title="Data">
        <ToggleSetting
          label="Sync to Cloud"
          description="Back up your garden data automatically"
          defaultOn={false}
        />
        <div className="py-3">
          <button className="text-sm text-red-500 font-medium hover:text-red-700 transition-colors">
            Reset All Data
          </button>
          <p className="text-xs text-garden-400 mt-0.5">Clears all plants and watering history</p>
        </div>
      </Section>

      <div className="text-center py-2">
        <p className="text-xs text-garden-400">SmartGarden v1.0.0</p>
      </div>
    </div>
  )
}