import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'
import StockCard from '../shared/StockCard'
import {
  formatINR, formatPercent, timeAgo
} from '../../lib/formatCurrency'
import {
  getPriceChange, getFDMaturityAmount, getRDMaturityAmount,
  daysUntil, STOCK_EMOJI, STOCK_COLOR
} from '../../lib/stockHelpers'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import toast from 'react-hot-toast'

const TABS = ['Stocks', 'Fixed Deposit', 'Recurring Deposit']

// --- Stock Detail Modal ---
function StockDetail({ stock, onClose, portfolio, onTrade }) {
  const { account } = useStore()
  const [qty, setQty] = useState('')
  const [mode, setMode] = useState('buy')
  const [news, setNews] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const holding = portfolio.find((p) => p.stock_id === stock.id)
  const { pct, direction } = getPriceChange(stock.current_price, stock.previous_price)
  const emoji = STOCK_EMOJI[stock.ticker] || '📊'
  const color = STOCK_COLOR[stock.ticker] || '#7C3AED'
  const total = (Number(qty) || 0) * stock.current_price
  const canSell = holding && Number(qty) <= holding.quantity && Number(qty) > 0
  const canBuy = total > 0 && total <= (account?.balance || 0)

  useEffect(() => {
    // Load news + simulate price history from current/previous
    supabase
      .from('news')
      .select('*')
      .eq('stock_id', stock.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setNews(data || []))

    // Build fake 24-tick history from current and previous price
    const ticks = []
    for (let i = 23; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 0.04
      const base = i === 0 ? stock.current_price : stock.previous_price
      ticks.push({
        tick: `T-${i}`,
        price: +(base * (1 + variance)).toFixed(2),
      })
    }
    ticks.push({ tick: 'Now', price: stock.current_price })
    setPriceHistory(ticks)
  }, [stock])

  const handleTrade = async () => {
    const quantity = Number(qty)
    if (!quantity || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    setSubmitting(true)
    await onTrade(stock, quantity, mode)
    setSubmitting(false)
    setQty('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: color + '25' }}>
              {emoji}
            </div>
            <div>
              <p className="font-display font-800 text-gray-800">{stock.company_name}</p>
              <p className="font-display font-700 text-gray-400 text-xs">{stock.ticker}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Price */}
          <div className="flex items-center gap-3">
            <p className="font-display font-900 text-2xl text-gray-800">{formatINR(stock.current_price)}</p>
            <span className={`text-sm font-display font-700 px-2 py-0.5 rounded-full ${direction === 'up' ? 'bg-green-100 text-green-600' : direction === 'down' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
              {formatPercent(pct)}
            </span>
          </div>

          {/* Chart */}
          {priceHistory.length > 0 && (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="tick" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    formatter={(v) => [formatINR(v), 'Price']}
                    contentStyle={{ borderRadius: 12, fontSize: 12, fontFamily: 'Nunito' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={direction === 'down' ? '#EF4444' : color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Description */}
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="font-display font-700 text-gray-500 text-xs mb-1">ABOUT</p>
            <p className="font-body text-gray-700 text-sm">{stock.description}</p>
          </div>

          {/* Holding */}
          {holding && holding.quantity > 0 && (
            <div className="bg-purple-50 rounded-2xl p-3 flex justify-between">
              <div>
                <p className="font-display font-700 text-purple-400 text-xs">YOUR HOLDING</p>
                <p className="font-display font-800 text-purple-700">{holding.quantity} units</p>
              </div>
              <div className="text-right">
                <p className="font-display font-700 text-purple-400 text-xs">AVG PRICE</p>
                <p className="font-display font-800 text-purple-700">{formatINR(holding.avg_buy_price)}</p>
              </div>
            </div>
          )}

          {/* Trade form */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('buy')}
                className={`flex-1 py-2 rounded-xl font-display font-700 text-sm transition-all ${mode === 'buy' ? 'bg-green-500 text-white' : 'bg-white text-gray-500'}`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`flex-1 py-2 rounded-xl font-display font-700 text-sm transition-all ${mode === 'sell' ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}
              >
                Sell
              </button>
            </div>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity"
              className="input-field mb-2"
              min="1"
            />
            {qty && (
              <p className="font-display font-700 text-gray-500 text-sm mb-3">
                Total: <span className="text-gray-800 font-800">{formatINR(total)}</span>
                {mode === 'buy' && (
                  <span className="text-gray-400 ml-2 text-xs">
                    (Balance: {formatINR(account?.balance || 0)})
                  </span>
                )}
              </p>
            )}
            <button
              onClick={handleTrade}
              disabled={submitting || (mode === 'buy' ? !canBuy : !canSell)}
              className={`w-full py-3 rounded-2xl font-display font-800 text-white transition-all active:scale-95 disabled:opacity-50 ${mode === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {submitting ? 'Processing…' : mode === 'buy' ? `Buy ${qty || ''} shares` : `Sell ${qty || ''} shares`}
            </button>
          </div>

          {/* News */}
          {news.length > 0 && (
            <div>
              <p className="font-display font-800 text-gray-700 mb-2">Latest News</p>
              <div className="space-y-2">
                {news.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={n.sentiment === 'positive' ? 'text-green-500' : n.sentiment === 'negative' ? 'text-red-500' : 'text-gray-400'}>
                        {n.sentiment === 'positive' ? '🟢' : n.sentiment === 'negative' ? '🔴' : '⚪'}
                      </span>
                      <p className="font-display font-700 text-gray-800 text-sm">{n.headline}</p>
                    </div>
                    <p className="font-body text-gray-500 text-xs">{timeAgo(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- FD Section ---
function FDSection({ userId }) {
  const { account, refreshAccount } = useStore()
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState(30)
  const [rate] = useState(7)
  const [fds, setFds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadFDs() }, [userId])

  const loadFDs = async () => {
    const { data } = await supabase
      .from('fixed_deposits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_matured', false)
      .order('created_at', { ascending: false })
    setFds(data || [])
    setLoading(false)
  }

  const projected = getFDMaturityAmount(Number(amount) || 0, rate, duration)
  const interest = projected - (Number(amount) || 0)

  const handleCreate = async () => {
    const principal = Number(amount)
    if (!principal || principal <= 0) { toast.error('Enter valid amount'); return }
    if (principal > (account?.balance || 0)) { toast.error('Insufficient balance'); return }

    setSubmitting(true)
    const maturityDate = new Date()
    maturityDate.setDate(maturityDate.getDate() + duration)

    const { error } = await supabase.rpc('create_fixed_deposit', {
      p_user_id: userId,
      p_principal: principal,
      p_interest_rate: rate,
      p_duration_days: duration,
      p_maturity_date: maturityDate.toISOString(),
    })

    if (error) {
      // Fallback: direct insert + transaction
      const { error: e2 } = await supabase.from('fixed_deposits').insert({
        user_id: userId,
        principal,
        interest_rate: rate,
        duration_days: duration,
        maturity_date: maturityDate.toISOString(),
        is_matured: false,
      })
      if (!e2) {
        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'fd_open',
          amount: principal,
          description: `Fixed Deposit for ${duration} days @ ${rate}%`,
        })
        await supabase.from('accounts').update({
          balance: (account?.balance || 0) - principal,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
    }

    await refreshAccount()
    await loadFDs()
    setAmount('')
    toast.success('Fixed Deposit created! 🔒')
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-display font-800 text-gray-800 mb-3">Open Fixed Deposit</h3>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (₹)"
          className="input-field mb-3"
        />

        <div className="flex gap-2 mb-3">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 py-2.5 rounded-xl font-display font-700 text-sm transition-all ${duration === d ? 'bg-kidbank-yellow text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {d} days
            </button>
          ))}
        </div>

        <div className="bg-yellow-50 rounded-2xl p-3 mb-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-display text-gray-500">Interest Rate</span>
            <span className="font-display font-700 text-gray-800">{rate}% p.a.</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-display text-gray-500">Interest Earned</span>
            <span className="font-display font-700 text-green-600">+{formatINR(interest)}</span>
          </div>
          <div className="flex justify-between border-t border-yellow-200 pt-1 mt-1">
            <span className="font-display font-700 text-gray-700">Maturity Amount</span>
            <span className="font-display font-800 text-kidbank-yellow">{formatINR(projected)}</span>
          </div>
        </div>

        <button onClick={handleCreate} disabled={submitting || !amount} className="w-full btn-primary">
          {submitting ? 'Creating…' : 'Create FD 🔒'}
        </button>
      </div>

      {fds.length > 0 && (
        <div className="card">
          <h3 className="font-display font-800 text-gray-800 mb-3">Active FDs</h3>
          <div className="space-y-3">
            {fds.map((fd) => (
              <div key={fd.id} className="bg-yellow-50 rounded-2xl p-3">
                <div className="flex justify-between mb-1">
                  <span className="font-display font-700 text-gray-700">{formatINR(fd.principal)}</span>
                  <span className="font-display font-700 text-yellow-600">{fd.interest_rate}% p.a.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-body text-gray-500">{fd.duration_days} days</span>
                  <span className="font-display font-700 text-orange-500">
                    {daysUntil(fd.maturity_date)}d left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- RD Section ---
function RDSection({ userId }) {
  const { account, refreshAccount } = useStore()
  const [monthly, setMonthly] = useState('')
  const [months, setMonths] = useState(6)
  const [rate] = useState(6)
  const [rds, setRds] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadRDs() }, [userId])

  const loadRDs = async () => {
    const { data } = await supabase
      .from('recurring_deposits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setRds(data || [])
  }

  const maturity = getRDMaturityAmount(Number(monthly) || 0, rate, months)

  const handleCreate = async () => {
    const amt = Number(monthly)
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return }
    if (amt > (account?.balance || 0)) { toast.error('Insufficient balance for first installment'); return }

    setSubmitting(true)
    const nextDue = new Date()
    nextDue.setMonth(nextDue.getMonth() + 1)

    await supabase.from('recurring_deposits').insert({
      user_id: userId,
      monthly_amount: amt,
      interest_rate: rate,
      duration_months: months,
      installments_paid: 1,
      next_due_date: nextDue.toISOString(),
      is_active: true,
    })

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'rd_installment',
      amount: amt,
      description: `RD Installment 1/${months}`,
    })

    await supabase.from('accounts').update({
      balance: (account?.balance || 0) - amt,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    await refreshAccount()
    await loadRDs()
    setMonthly('')
    toast.success('RD Started! 🎉')
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-display font-800 text-gray-800 mb-3">Start Recurring Deposit</h3>

        <input
          type="number"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          placeholder="Monthly Amount (₹)"
          className="input-field mb-3"
        />

        <div className="flex gap-2 mb-3">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`flex-1 py-2.5 rounded-xl font-display font-700 text-sm transition-all ${months === m ? 'bg-kidbank-green text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {m} mo
            </button>
          ))}
        </div>

        <div className="bg-green-50 rounded-2xl p-3 mb-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-display text-gray-500">Interest Rate</span>
            <span className="font-display font-700 text-gray-800">{rate}% p.a.</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-display text-gray-500">Total Invested</span>
            <span className="font-display font-700 text-gray-800">{formatINR((Number(monthly) || 0) * months)}</span>
          </div>
          <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
            <span className="font-display font-700 text-gray-700">Maturity Amount</span>
            <span className="font-display font-800 text-kidbank-green">{formatINR(maturity)}</span>
          </div>
        </div>

        <button onClick={handleCreate} disabled={submitting || !monthly} className="w-full btn-primary">
          {submitting ? 'Starting…' : 'Start RD 📅'}
        </button>
      </div>

      {rds.length > 0 && (
        <div className="card">
          <h3 className="font-display font-800 text-gray-800 mb-3">Active RDs</h3>
          <div className="space-y-3">
            {rds.map((rd) => (
              <div key={rd.id} className="bg-green-50 rounded-2xl p-3">
                <div className="flex justify-between mb-1">
                  <span className="font-display font-700 text-gray-700">
                    {formatINR(rd.monthly_amount)}/mo
                  </span>
                  <span className="font-display font-700 text-green-600">{rd.interest_rate}% p.a.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-body text-gray-500">
                    {rd.installments_paid}/{rd.duration_months} paid
                  </span>
                  <span className="font-display font-700 text-orange-500">
                    Next: {daysUntil(rd.next_due_date)}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---
export default function InvestTab() {
  const { profile, stocks, account, refreshAccount, setStocks } = useStore()
  const [activeTab, setActiveTab] = useState(0)
  const [selectedStock, setSelectedStock] = useState(null)
  const [portfolio, setPortfolio] = useState([])

  useEffect(() => {
    loadStocks()
    loadPortfolio()
  }, [profile])

  const loadStocks = async () => {
    const { data } = await supabase.from('stocks').select('*').order('company_name')
    if (data) setStocks(data)
  }

  const loadPortfolio = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', profile.id)
    setPortfolio(data || [])
  }

  const handleTrade = async (stock, quantity, mode) => {
    const total = stock.current_price * quantity
    const balance = account?.balance || 0

    if (mode === 'buy') {
      if (total > balance) { toast.error('Not enough balance!'); return }

      const existing = portfolio.find((p) => p.stock_id === stock.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        const newAvg = ((existing.avg_buy_price * existing.quantity) + total) / newQty
        await supabase.from('portfolio').update({
          quantity: newQty,
          avg_buy_price: newAvg,
        }).eq('id', existing.id)
      } else {
        await supabase.from('portfolio').insert({
          user_id: profile.id,
          stock_id: stock.id,
          quantity,
          avg_buy_price: stock.current_price,
          purchased_at: new Date().toISOString(),
        })
      }

      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'investment_buy',
        amount: total,
        description: `Bought ${quantity} ${stock.ticker} @ ${formatINR(stock.current_price)}`,
      })

      await supabase.from('accounts').update({
        balance: balance - total,
        updated_at: new Date().toISOString(),
      }).eq('user_id', profile.id)

      toast.success(`Bought ${quantity} ${stock.ticker}! 📈`)
    } else {
      const holding = portfolio.find((p) => p.stock_id === stock.id)
      if (!holding || holding.quantity < quantity) {
        toast.error("You don't have enough shares!")
        return
      }

      const proceeds = stock.current_price * quantity
      const newQty = holding.quantity - quantity

      if (newQty === 0) {
        await supabase.from('portfolio').delete().eq('id', holding.id)
      } else {
        await supabase.from('portfolio').update({ quantity: newQty }).eq('id', holding.id)
      }

      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'investment_sell',
        amount: proceeds,
        description: `Sold ${quantity} ${stock.ticker} @ ${formatINR(stock.current_price)}`,
      })

      await supabase.from('accounts').update({
        balance: balance + proceeds,
        updated_at: new Date().toISOString(),
      }).eq('user_id', profile.id)

      toast.success(`Sold ${quantity} ${stock.ticker}! 💰`)
    }

    await refreshAccount()
    await loadPortfolio()
  }

  const getHolding = (stockId) => portfolio.find((p) => p.stock_id === stockId)

  return (
    <div className="p-4">
      <h2 className="font-display font-900 text-gray-800 text-xl mb-4">Invest 📈</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 rounded-xl font-display font-700 text-xs transition-all ${activeTab === i ? 'bg-white text-kidbank-purple shadow-sm' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stocks */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {stocks.length === 0 ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-3xl" />)}
            </div>
          ) : (
            stocks.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                onClick={setSelectedStock}
                holding={getHolding(stock.id)}
              />
            ))
          )}
        </div>
      )}

      {/* FD */}
      {activeTab === 1 && <FDSection userId={profile?.id} />}

      {/* RD */}
      {activeTab === 2 && <RDSection userId={profile?.id} />}

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetail
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          portfolio={portfolio}
          onTrade={handleTrade}
        />
      )}
    </div>
  )
}
