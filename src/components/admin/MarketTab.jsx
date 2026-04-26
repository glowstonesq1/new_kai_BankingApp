import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR, formatPercent } from '../../lib/formatCurrency'
import { getPriceChange, STOCK_EMOJI, STOCK_COLOR } from '../../lib/stockHelpers'
import toast from 'react-hot-toast'

function StockAdminCard({ stock, updating, onRandomTick, onManualPrice }) {
  const [manualPrice, setManualPrice] = useState('')
  const { pct, direction } = getPriceChange(stock.current_price, stock.previous_price)
  const emoji = STOCK_EMOJI[stock.ticker] || '📊'
  const color = STOCK_COLOR[stock.ticker] || '#7C3AED'

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: color + '20' }}>
          {emoji}
        </div>
        <div>
          <p className="font-display font-800 text-gray-800 text-sm">{stock.company_name}</p>
          <p className="font-display font-700 text-gray-400 text-xs">{stock.ticker}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <p className="font-display font-800 text-gray-800">{formatINR(stock.current_price)}</p>
        <span className={`text-xs font-display font-700 ${direction === 'up' ? 'text-green-600' : direction === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
          {formatPercent(pct)}
        </span>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="number"
          placeholder="Set price"
          value={manualPrice}
          onChange={(e) => setManualPrice(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-display font-700 focus:border-kidbank-purple focus:outline-none"
        />
        <button
          onClick={() => { onManualPrice(stock, manualPrice); setManualPrice('') }}
          disabled={updating === stock.id}
          className="bg-kidbank-purple text-white font-display font-700 px-3 py-2 rounded-xl text-sm"
        >
          Set
        </button>
      </div>

      <button
        onClick={() => onRandomTick(stock)}
        disabled={updating === stock.id}
        className="w-full bg-gray-100 text-gray-700 font-display font-700 py-2 rounded-xl text-sm hover:bg-purple-50 hover:text-kidbank-purple transition-colors"
      >
        {updating === stock.id ? 'Updating…' : '🎲 Random Price Tick'}
      </button>
    </div>
  )
}

export default function MarketTab() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [portfolios, setPortfolios] = useState([])
  const [kids, setKids] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [stocksRes, portRes, kidsRes] = await Promise.all([
      supabase.from('stocks').select('*').order('company_name'),
      supabase.from('portfolio').select('*, users(display_name), stocks(company_name, ticker, current_price)').gt('quantity', 0),
      supabase.from('users').select('id, display_name').eq('role', 'kid'),
    ])
    setStocks(stocksRes.data || [])
    setPortfolios(portRes.data || [])
    setKids(kidsRes.data || [])
    setLoading(false)
  }

  const handlePriceUpdate = async (stock) => {
    setUpdating(stock.id)
    const minPct = 2, maxPct = 8
    const direction = Math.random() > 0.5 ? 1 : -1
    const pct = minPct + Math.random() * (maxPct - minPct)
    const newPrice = +(stock.current_price * (1 + direction * pct / 100)).toFixed(2)

    const { error } = await supabase
      .from('stocks')
      .update({
        previous_price: stock.current_price,
        current_price: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stock.id)

    if (error) {
      toast.error('Update failed')
    } else {
      toast.success(`${stock.ticker} updated to ${formatINR(newPrice)}`)
      await loadData()
    }
    setUpdating(null)
  }

  const handleManualPrice = async (stock, newPrice) => {
    if (!newPrice || Number(newPrice) <= 0) { toast.error('Enter valid price'); return }
    setUpdating(stock.id)

    await supabase.from('stocks').update({
      previous_price: stock.current_price,
      current_price: Number(newPrice),
      updated_at: new Date().toISOString(),
    }).eq('id', stock.id)

    toast.success(`${stock.ticker} price set to ${formatINR(Number(newPrice))}`)
    await loadData()
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display font-900 text-2xl text-gray-800">Market Management</h1>

      {/* Stocks */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-3xl" />)
          : stocks.map((stock) => (
              <StockAdminCard
                key={stock.id}
                stock={stock}
                updating={updating}
                onRandomTick={handlePriceUpdate}
                onManualPrice={handleManualPrice}
              />
            ))}
      </div>

      {/* Kids portfolios */}
      {portfolios.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-display font-800 text-gray-800 mb-4">Kid Portfolios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-display font-700 text-gray-500 py-2">Kid</th>
                  <th className="text-left font-display font-700 text-gray-500 py-2">Stock</th>
                  <th className="text-right font-display font-700 text-gray-500 py-2">Qty</th>
                  <th className="text-right font-display font-700 text-gray-500 py-2">Avg Price</th>
                  <th className="text-right font-display font-700 text-gray-500 py-2">Current Value</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 font-display font-700 text-gray-700">{p.users?.display_name}</td>
                    <td className="py-2 font-display text-gray-600">{p.stocks?.company_name} ({p.stocks?.ticker})</td>
                    <td className="py-2 text-right font-display font-700 text-gray-700">{p.quantity}</td>
                    <td className="py-2 text-right font-display text-gray-500">{formatINR(p.avg_buy_price)}</td>
                    <td className="py-2 text-right font-display font-800 text-kidbank-purple">
                      {formatINR((p.stocks?.current_price || 0) * p.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
