import { formatINR } from '../../lib/formatCurrency'

export default function BalanceDisplay({ balance, size = 'large', label = 'Balance' }) {
  const sizeClasses = {
    large: 'text-4xl md:text-5xl',
    medium: 'text-2xl md:text-3xl',
    small: 'text-xl',
  }

  return (
    <div className="text-center">
      <p className="font-display font-700 text-white/80 text-sm uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`font-display font-900 text-white ${sizeClasses[size]} drop-shadow-sm`}>
        {formatINR(balance)}
      </p>
    </div>
  )
}
