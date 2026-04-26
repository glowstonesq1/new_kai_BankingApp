export function getPriceChange(current, previous) {
  if (!previous || previous === 0) return { change: 0, pct: 0, direction: 'neutral' }
  const change = current - previous
  const pct = (change / previous) * 100
  return {
    change,
    pct,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  }
}

export function getPortfolioValue(portfolio, stocks) {
  return portfolio.reduce((total, holding) => {
    const stock = stocks.find((s) => s.id === holding.stock_id)
    if (!stock) return total
    return total + stock.current_price * holding.quantity
  }, 0)
}

export function getPortfolioCost(portfolio) {
  return portfolio.reduce((total, h) => total + h.avg_buy_price * h.quantity, 0)
}

export function getFDMaturityAmount(principal, ratePercent, durationDays) {
  const rate = ratePercent / 100
  const years = durationDays / 365
  return principal * Math.pow(1 + rate, years)
}

export function getRDMaturityAmount(monthlyAmount, ratePercent, durationMonths) {
  const r = ratePercent / 100 / 12
  if (r === 0) return monthlyAmount * durationMonths
  return monthlyAmount * ((Math.pow(1 + r, durationMonths) - 1) / r) * (1 + r)
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target - now
  return Math.max(0, Math.ceil(diffMs / 86400000))
}

export const TX_ICONS = {
  deposit: { icon: '⬆️', color: 'text-green-600', bg: 'bg-green-50', label: 'Deposit' },
  withdrawal: { icon: '⬇️', color: 'text-red-600', bg: 'bg-red-50', label: 'Withdrawal' },
  payment: { icon: '💳', color: 'text-orange-600', bg: 'bg-orange-50', label: 'Payment' },
  investment_buy: { icon: '📈', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Bought Stock' },
  investment_sell: { icon: '📉', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Sold Stock' },
  fd_open: { icon: '🔒', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Fixed Deposit' },
  rd_installment: { icon: '🔒', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'RD Installment' },
  interest_credit: { icon: '✨', color: 'text-green-600', bg: 'bg-green-50', label: 'Interest' },
}

export const STOCK_EMOJI = {
  SWE: '☀️',
  MBF: '🍿',
  ZRM: '🛵',
  CNT: '☁️',
  GGF: '🌱',
  PPG: '🎮',
}

export const STOCK_COLOR = {
  SWE: '#F59E0B',
  MBF: '#EF4444',
  ZRM: '#10B981',
  CNT: '#3B82F6',
  GGF: '#22C55E',
  PPG: '#8B5CF6',
}
