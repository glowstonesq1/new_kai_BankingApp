import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'
import { formatINR } from '../../lib/formatCurrency'
import toast from 'react-hot-toast'

async function fireConfetti() {
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'],
  })
}

function GoalCard({ goal, onAllocate, onDelete, onClaim }) {
  const pct = goal.target_amount > 0
    ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
    : 0
  const isComplete = pct >= 100
  const [allocating, setAllocating] = useState(false)
  const [allocAmt, setAllocAmt] = useState('')
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  return (
    <div className={`card ${isComplete ? 'border-2 border-kidbank-green' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-800 text-gray-800">{goal.goal_name}</h3>
          <p className="font-display font-700 text-gray-400 text-sm">
            {formatINR(goal.current_amount)} / {formatINR(goal.target_amount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <span className="text-2xl animate-bounce">🏆</span>}
          {!isComplete && (
            <button
              onClick={() => setConfirmingWithdraw(true)}
              className="text-gray-300 hover:text-red-400 transition-colors text-lg"
              title="Cancel goal & return money"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-kidbank-green' : 'bg-gradient-to-r from-kidbank-purple to-kidbank-pink'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-display font-700 text-gray-400 text-xs text-right mb-3">
        {pct.toFixed(0)}% complete
      </p>

      {isComplete ? (
        <div className="bg-green-50 rounded-2xl p-3 text-center space-y-2">
          <p className="font-display font-800 text-green-600">🎉 Goal Achieved! Amazing work!</p>
          <button
            onClick={() => onClaim(goal)}
            className="w-full bg-green-500 text-white font-display font-800 py-3 rounded-xl active:scale-95 transition-all"
          >
            Claim {formatINR(goal.current_amount)} 🏆
          </button>
        </div>
      ) : confirmingWithdraw ? (
        <div className="bg-red-50 rounded-2xl p-3 text-sm space-y-2">
          <p className="font-display font-700 text-red-700">
            Cancel goal and return {formatINR(goal.current_amount)} to your balance?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(goal); setConfirmingWithdraw(false) }}
              className="flex-1 bg-red-500 text-white font-display font-700 py-2 rounded-xl text-sm"
            >
              Yes, Return Money
            </button>
            <button
              onClick={() => setConfirmingWithdraw(false)}
              className="flex-1 bg-gray-200 text-gray-600 font-display font-700 py-2 rounded-xl text-sm"
            >
              Keep Saving
            </button>
          </div>
        </div>
      ) : (
        <>
          {allocating ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-display font-700">₹</span>
                <input
                  type="number"
                  value={allocAmt}
                  onChange={(e) => setAllocAmt(e.target.value)}
                  placeholder="Amount"
                  className="input-field pl-7 py-2 text-sm"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  onAllocate(goal, Number(allocAmt))
                  setAllocAmt('')
                  setAllocating(false)
                }}
                className="bg-kidbank-purple text-white font-display font-700 px-4 rounded-xl text-sm"
              >
                Add
              </button>
              <button
                onClick={() => setAllocating(false)}
                className="text-gray-400 font-display font-700 px-2 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAllocating(true)}
              className="w-full bg-purple-50 text-kidbank-purple font-display font-700 py-2.5 rounded-xl text-sm hover:bg-purple-100 transition-colors"
            >
              + Add Money to Goal
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function GoalsTab() {
  const { profile, account, refreshAccount } = useStore()
  const [goals, setGoals] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profile) loadGoals()
  }, [profile])

  const loadGoals = async () => {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!goalName.trim()) { toast.error('Enter a goal name'); return }
    if (!targetAmount || Number(targetAmount) <= 0) { toast.error('Enter target amount'); return }

    setSubmitting(true)
    await supabase.from('savings_goals').insert({
      user_id: profile.id,
      goal_name: goalName.trim(),
      target_amount: Number(targetAmount),
      current_amount: 0,
    })

    await loadGoals()
    setGoalName('')
    setTargetAmount('')
    setShowForm(false)
    toast.success('Goal created! 🎯')
    setSubmitting(false)
  }

  const handleAllocate = async (goal, amount) => {
    if (!amount || amount <= 0) { toast.error('Enter valid amount'); return }
    if (amount > (account?.balance || 0)) { toast.error('Not enough balance!'); return }

    const newAmount = goal.current_amount + amount
    const isNowComplete = newAmount >= goal.target_amount

    await supabase.from('savings_goals').update({
      current_amount: newAmount,
    }).eq('id', goal.id)

    await supabase.from('accounts').update({
      balance: (account?.balance || 0) - amount,
      updated_at: new Date().toISOString(),
    }).eq('user_id', profile.id)

    await refreshAccount()
    await loadGoals()

    if (isNowComplete) {
      toast.success(`🎉 Goal "${goal.goal_name}" completed! Tap Claim to get your money.`, { duration: 5000 })
      await fireConfetti()
    } else {
      toast.success(`Added ${formatINR(amount)} to ${goal.goal_name}!`)
    }
  }

  const handleClaim = async (goal) => {
    await supabase.from('accounts').update({
      balance: (account?.balance || 0) + goal.current_amount,
      updated_at: new Date().toISOString(),
    }).eq('user_id', profile.id)

    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'deposit',
      amount: goal.current_amount,
      description: `Goal achieved: ${goal.goal_name} 🎉`,
    })

    await supabase.from('savings_goals').delete().eq('id', goal.id)

    await refreshAccount()
    await loadGoals()
    toast.success(`${formatINR(goal.current_amount)} added to your balance! 🎉`)
    await fireConfetti()
  }

  const handleDelete = async (goal) => {
    if (goal.current_amount > 0) {
      await supabase.from('accounts').update({
        balance: (account?.balance || 0) + goal.current_amount,
        updated_at: new Date().toISOString(),
      }).eq('user_id', profile.id)

      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'deposit',
        amount: goal.current_amount,
        description: `Goal cancelled: ${goal.goal_name} — savings returned`,
      })

      await refreshAccount()
    }

    await supabase.from('savings_goals').delete().eq('id', goal.id)
    await loadGoals()
    toast.success(
      goal.current_amount > 0
        ? `Returned ${formatINR(goal.current_amount)} to balance`
        : 'Goal removed'
    )
  }

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-900 text-gray-800 text-xl">My Goals 🎯</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-kidbank-purple text-white font-display font-700 px-4 py-2 rounded-xl text-sm"
        >
          + New Goal
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="bg-gradient-to-r from-kidbank-purple to-kidbank-pink rounded-3xl p-4 text-white">
          <p className="font-display font-700 text-white/70 text-sm">Total Saved Toward Goals</p>
          <p className="font-display font-900 text-2xl">{formatINR(totalSaved)}</p>
          <p className="font-display font-700 text-white/70 text-sm mt-1">
            {goals.filter((g) => g.current_amount >= g.target_amount).length} of {goals.length} goals achieved! 🏆
          </p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card border-2 border-kidbank-purple">
          <h3 className="font-display font-800 text-gray-800 mb-3">New Savings Goal</h3>
          <input
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="Goal name (e.g. New Bicycle)"
            className="input-field mb-3"
          />
          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-display font-700">₹</span>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="Target amount"
              className="input-field pl-8"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={submitting} className="flex-1 btn-primary py-3">
              {submitting ? 'Creating…' : 'Create Goal 🎯'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-3xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🎯</div>
          <p className="font-display font-800 text-gray-500 text-lg">No goals yet!</p>
          <p className="font-display font-700 text-gray-400 text-sm mt-1">
            Set a savings goal to start working toward something exciting!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAllocate={handleAllocate}
              onDelete={handleDelete}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}
    </div>
  )
}
