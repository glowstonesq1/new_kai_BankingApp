import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../lib/formatCurrency'
import toast from 'react-hot-toast'

const QUICK_AMOUNTS = [50, 100, 200, 500]

export default function DepositTab() {
  const [kids, setKids] = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('deposit')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(null)
  const [lastTx, setLastTx] = useState(null)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, display_name, username')
      .eq('role', 'kid')
      .then(({ data }) => setKids(data || []))
  }, [])

  useEffect(() => {
    if (!selectedKid) { setBalance(null); return }
    supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', selectedKid)
      .single()
      .then(({ data }) => setBalance(data?.balance ?? null))
  }, [selectedKid])

  const handleSubmit = async () => {
    const amt = Number(amount)
    if (!selectedKid) { toast.error('Select a kid'); return }
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return }

    if (type === 'withdrawal' && balance !== null && amt > balance) {
      toast.error(`Insufficient balance! Kid only has ${formatINR(balance)}`)
      return
    }

    setLoading(true)
    try {
      const newBalance = type === 'deposit'
        ? (balance || 0) + amt
        : (balance || 0) - amt

      await supabase.from('accounts').update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('user_id', selectedKid)

      const { data: tx } = await supabase.from('transactions').insert({
        user_id: selectedKid,
        type,
        amount: amt,
        description: description || (type === 'deposit' ? 'Admin deposit' : 'Admin withdrawal'),
      }).select().single()

      setBalance(newBalance)
      setLastTx({ ...tx, kidName: kids.find((k) => k.id === selectedKid)?.display_name, newBalance })
      setAmount('')
      setDescription('')

      toast.success(
        type === 'deposit'
          ? `Deposited ${formatINR(amt)} successfully! ✅`
          : `Withdrawn ${formatINR(amt)} successfully! ✅`
      )
    } catch (err) {
      toast.error('Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display font-900 text-2xl text-gray-800">Deposit / Withdraw</h1>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        {/* Kid selector */}
        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">Select Kid</label>
          <select
            value={selectedKid}
            onChange={(e) => setSelectedKid(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a kid…</option>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>{k.display_name} (@{k.username})</option>
            ))}
          </select>
        </div>

        {/* Balance display */}
        {selectedKid && balance !== null && (
          <div className="bg-purple-50 rounded-2xl px-4 py-3 flex justify-between items-center">
            <span className="font-display font-700 text-gray-500 text-sm">Current Balance</span>
            <span className="font-display font-800 text-kidbank-purple text-lg">{formatINR(balance)}</span>
          </div>
        )}

        {/* Type toggle */}
        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">Transaction Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('deposit')}
              className={`flex-1 py-3 rounded-2xl font-display font-700 transition-all ${type === 'deposit' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              ⬆️ Deposit
            </button>
            <button
              onClick={() => setType('withdrawal')}
              className={`flex-1 py-3 rounded-2xl font-display font-700 transition-all ${type === 'withdrawal' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              ⬇️ Withdraw
            </button>
          </div>
        </div>

        {/* Quick amounts */}
        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">Quick Amounts</label>
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`flex-1 py-2 rounded-xl font-display font-700 text-sm border-2 transition-all
                  ${amount === String(a) ? 'border-kidbank-purple bg-purple-50 text-kidbank-purple' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
              >
                ₹{a}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-700 text-gray-400 text-lg">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-field pl-8 text-lg font-display font-700"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">
            Description <span className="text-gray-400 font-400">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Pocket money for helping with garden"
            className="input-field"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selectedKid || !amount}
          className={`w-full py-4 rounded-2xl font-display font-800 text-white text-lg transition-all active:scale-95 disabled:opacity-50
            ${type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {loading
            ? 'Processing…'
            : type === 'deposit'
            ? `Deposit ${amount ? formatINR(Number(amount)) : ''} ✅`
            : `Withdraw ${amount ? formatINR(Number(amount)) : ''} ⬇️`}
        </button>
      </div>

      {/* Confirmation card */}
      {lastTx && (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="font-display font-800 text-green-800">Transaction Confirmed!</h3>
          </div>
          <p className="font-display font-700 text-green-700">
            {lastTx.type === 'deposit' ? 'Deposited' : 'Withdrawn'} {formatINR(lastTx.amount)} {lastTx.type === 'deposit' ? 'to' : 'from'} <span className="font-800">{lastTx.kidName}</span>
          </p>
          <p className="font-display text-green-600 text-sm mt-1">
            New balance: <span className="font-800">{formatINR(lastTx.newBalance)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
