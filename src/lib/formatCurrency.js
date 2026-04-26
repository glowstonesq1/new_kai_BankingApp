/**
 * Format a number as Indian Rupees with Indian numbering system (lakhs/crores).
 * e.g. 123456 → ₹1,23,456
 */
export function formatINR(amount, options = {}) {
  const { compact = false, showSign = false } = options
  const num = Number(amount) || 0

  if (compact) {
    if (Math.abs(num) >= 10_000_000) {
      return `₹${(num / 10_000_000).toFixed(2)} Cr`
    }
    if (Math.abs(num) >= 100_000) {
      return `₹${(num / 100_000).toFixed(2)} L`
    }
    if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(1)}K`
    }
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num))

  if (showSign && num > 0) return `+${formatted}`
  if (num < 0) return `-${formatted}`
  return formatted
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(Number(num) || 0)
}

export function formatPercent(num, showSign = true) {
  const n = Number(num) || 0
  const sign = showSign && n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
