import { formatINR, formatPercent } from '../../lib/formatCurrency'
import { getPriceChange, STOCK_EMOJI, STOCK_COLOR, STOCK_CAP } from '../../lib/stockHelpers'

const CAP_STYLE = {
  large: { label: 'Large Cap', bg: 'bg-blue-100', text: 'text-blue-700' },
  mid: { label: 'Mid Cap', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  small: { label: 'Small Cap', bg: 'bg-green-100', text: 'text-green-700' },
}

export default function StockCard({ stock, onClick, holding }) {
  const { pct, direction } = getPriceChange(stock.current_price, stock.previous_price)
  const emoji = STOCK_EMOJI[stock.ticker] || '📊'
  const color = STOCK_COLOR[stock.ticker] || '#7C3AED'
  const isUp = direction === 'up'
  const isDown = direction === 'down'
  const cap = STOCK_CAP[stock.ticker]
  const capStyle = cap ? CAP_STYLE[cap] : null

  return (
    <button
      onClick={() => onClick?.(stock)}
      className="card w-full text-left active:scale-95 transition-all duration-150 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: color + '20' }}
          >
            {emoji}
          </div>
          <div>
            <p className="font-display font-800 text-gray-800 text-sm leading-tight">
              {stock.company_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="font-display font-700 text-gray-400 text-xs">{stock.ticker}</p>
              {capStyle && (
                <span className={`text-[10px] font-display font-700 px-1.5 py-0.5 rounded-full ${capStyle.bg} ${capStyle.text}`}>
                  {capStyle.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="font-display font-800 text-gray-800">{formatINR(stock.current_price)}</p>
          <div className="flex items-center gap-1 justify-end">
            <span className={`text-xs font-display font-700 ${isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-gray-400'}`}>
              {formatPercent(pct)}
            </span>
            {isUp && (
              <span className="text-green-500 animate-rocket text-xs">🚀</span>
            )}
            {isDown && (
              <span className="text-red-500 animate-fall text-xs">📉</span>
            )}
          </div>
        </div>
      </div>

      {holding && holding.quantity > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs">
          <span className="font-display text-gray-400">Your holding: <span className="font-700 text-gray-700">{holding.quantity} units</span></span>
          <span className="font-display font-700 text-kidbank-purple">
            {formatINR(stock.current_price * holding.quantity)}
          </span>
        </div>
      )}
    </button>
  )
}
