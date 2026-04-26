import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import TransactionList from '../shared/TransactionList'
import { formatINR } from '../../lib/formatCurrency'

export default function OverviewTab() {
  const [stats, setStats] = useState({ totalMoney: 0, activeKids: 0 })
  const [transactions, setTransactions] = useState([])
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [accountsRes, kidsRes, txRes] = await Promise.all([
      supabase.from('accounts').select('balance, user_id'),
      supabase.from('users').select('id, display_name, username, is_frozen').eq('role', 'kid'),
      supabase
        .from('transactions')
        .select('*, users(display_name)')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const accounts = accountsRes.data || []
    const kidList = kidsRes.data || []
    const totalMoney = accounts.reduce((s, a) => s + (a.balance || 0), 0)

    const kidsWithBalance = kidList.map((k) => {
      const acc = accounts.find((a) => a.user_id === k.id)
      return { ...k, balance: acc?.balance || 0 }
    })

    setStats({ totalMoney, activeKids: kidList.filter((k) => !k.is_frozen).length })
    setKids(kidsWithBalance)
    setTransactions(txRes.data || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display font-900 text-2xl text-gray-800">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-kidbank-purple to-purple-500 rounded-3xl p-4 text-white">
          <p className="font-display font-700 text-white/70 text-sm">Total Money</p>
          <p className="font-display font-900 text-xl mt-1">{formatINR(stats.totalMoney, { compact: true })}</p>
        </div>
        <div className="bg-gradient-to-br from-kidbank-green to-green-400 rounded-3xl p-4 text-white">
          <p className="font-display font-700 text-white/70 text-sm">Active Kids</p>
          <p className="font-display font-900 text-3xl mt-1">{stats.activeKids}</p>
        </div>
        <div className="bg-gradient-to-br from-kidbank-blue to-blue-400 rounded-3xl p-4 text-white">
          <p className="font-display font-700 text-white/70 text-sm">Total Accounts</p>
          <p className="font-display font-900 text-3xl mt-1">{kids.length}</p>
        </div>
        <div className="bg-gradient-to-br from-kidbank-orange to-orange-400 rounded-3xl p-4 text-white">
          <p className="font-display font-700 text-white/70 text-sm">Recent Transactions</p>
          <p className="font-display font-900 text-3xl mt-1">{transactions.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Kid accounts */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-display font-800 text-gray-800 mb-4">Kid Accounts</h2>
          {kids.length === 0 ? (
            <p className="font-display text-gray-400 text-center py-6">No kids yet. Create one!</p>
          ) : (
            <div className="space-y-3">
              {kids.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-display font-800 text-gray-800 text-sm">{k.display_name}</p>
                    <p className="font-display text-gray-400 text-xs">@{k.username}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-800 text-gray-800 text-sm">{formatINR(k.balance)}</p>
                    {k.is_frozen && (
                      <span className="text-xs font-display font-700 text-blue-500">🧊 Frozen</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-display font-800 text-gray-800 mb-4">Recent Transactions</h2>
          <TransactionList transactions={transactions} loading={loading} />
        </div>
      </div>
    </div>
  )
}
