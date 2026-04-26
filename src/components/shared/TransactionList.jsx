import { formatINR, timeAgo } from '../../lib/formatCurrency'
import { TX_ICONS } from '../../lib/stockHelpers'

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="skeleton w-10 h-10 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
      <div className="skeleton h-4 w-20 rounded" />
    </div>
  )
}

export default function TransactionList({ transactions, loading, emptyMessage = 'No transactions yet' }) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-50">
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📭</div>
        <p className="font-display font-700 text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {transactions.map((tx) => {
        const meta = TX_ICONS[tx.type] || TX_ICONS.payment
        const isCredit = ['deposit', 'investment_sell', 'interest_credit'].includes(tx.type)

        return (
          <div key={tx.id} className="flex items-center gap-3 py-3">
            <div className={`w-10 h-10 rounded-2xl ${meta.bg} flex items-center justify-center text-lg flex-shrink-0`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-700 text-gray-800 text-sm truncate">
                {tx.description || meta.label}
              </p>
              <p className="font-body text-gray-400 text-xs">{timeAgo(tx.created_at)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-display font-800 text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                {isCredit ? '+' : '-'}{formatINR(tx.amount)}
              </p>
              <p className="font-body text-gray-400 text-xs capitalize">{meta.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
