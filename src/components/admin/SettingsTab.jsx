import { useEffect, useState } from 'react'
import useStore from '../../store/useStore'
import toast from 'react-hot-toast'

export default function SettingsTab() {
  const { settings, setSettings } = useStore()
  const [local, setLocal] = useState(settings)

  const handleSave = () => {
    setSettings(local)
    // Persist to localStorage for now
    localStorage.setItem('kidbank_settings', JSON.stringify(local))
    toast.success('Settings saved! ✅')
  }

  const update = (key, value) => setLocal((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display font-900 text-2xl text-gray-800">Settings</h1>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="font-display font-800 text-gray-700">Interest Rates</h2>

        <div>
          <label className="flex justify-between font-display font-700 text-gray-600 text-sm mb-1.5">
            <span>Fixed Deposit Rate (annual)</span>
            <span className="text-kidbank-purple">{local.fd_interest_rate}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={local.fd_interest_rate}
            onChange={(e) => update('fd_interest_rate', Number(e.target.value))}
            className="w-full accent-kidbank-purple"
          />
          <div className="flex justify-between text-xs font-display text-gray-400 mt-1">
            <span>1%</span><span>15%</span>
          </div>
        </div>

        <div>
          <label className="flex justify-between font-display font-700 text-gray-600 text-sm mb-1.5">
            <span>Recurring Deposit Rate (annual)</span>
            <span className="text-kidbank-purple">{local.rd_interest_rate}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={local.rd_interest_rate}
            onChange={(e) => update('rd_interest_rate', Number(e.target.value))}
            className="w-full accent-kidbank-purple"
          />
          <div className="flex justify-between text-xs font-display text-gray-400 mt-1">
            <span>1%</span><span>12%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="font-display font-800 text-gray-700">Stock Price Updates</h2>

        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">
            Auto-update interval
          </label>
          <div className="flex gap-2">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                onClick={() => update('price_update_interval', m)}
                className={`flex-1 py-2.5 rounded-xl font-display font-700 text-sm transition-all ${local.price_update_interval === m ? 'bg-kidbank-purple text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-700 text-gray-700">Auto price updates</p>
            <p className="font-display text-gray-400 text-sm">Enable scheduled price ticks</p>
          </div>
          <button
            onClick={() => update('auto_price_updates', !local.auto_price_updates)}
            className={`w-12 h-6 rounded-full transition-all ${local.auto_price_updates ? 'bg-kidbank-purple' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${local.auto_price_updates ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div>
          <label className="flex justify-between font-display font-700 text-gray-600 text-sm mb-1.5">
            <span>Min fluctuation</span>
            <span className="text-kidbank-purple">{local.stock_min_fluctuation}%</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={local.stock_min_fluctuation}
            onChange={(e) => update('stock_min_fluctuation', Number(e.target.value))}
            className="w-full accent-kidbank-purple"
          />
        </div>

        <div>
          <label className="flex justify-between font-display font-700 text-gray-600 text-sm mb-1.5">
            <span>Max fluctuation</span>
            <span className="text-kidbank-purple">{local.stock_max_fluctuation}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={local.stock_max_fluctuation}
            onChange={(e) => update('stock_max_fluctuation', Number(e.target.value))}
            className="w-full accent-kidbank-purple"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-display font-800 text-gray-700 mb-4">Data Retention</h2>
        <div>
          <label className="flex justify-between font-display font-700 text-gray-600 text-sm mb-1.5">
            <span>Auto-delete transactions older than</span>
            <span className="text-kidbank-purple">{local.tx_delete_days} days</span>
          </label>
          <div className="flex gap-2">
            {[7, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => update('tx_delete_days', d)}
                className={`flex-1 py-2 rounded-xl font-display font-700 text-sm transition-all ${local.tx_delete_days === d ? 'bg-kidbank-orange text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-full btn-primary py-4 text-lg">
        Save Settings ✅
      </button>
    </div>
  )
}
