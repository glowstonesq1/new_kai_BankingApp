import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/formatCurrency'
import { STOCK_EMOJI, STOCK_COLOR } from '../../lib/stockHelpers'

function NewsCard({ article, stocks, onExpand }) {
  const stock = stocks.find((s) => s.id === article.stock_id)
  const emoji = stock ? STOCK_EMOJI[stock.ticker] || '📊' : '📰'
  const color = stock ? STOCK_COLOR[stock.ticker] || '#7C3AED' : '#7C3AED'
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: color + '20' }}
        >
          {emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {stock && (
              <span
                className="text-xs font-display font-700 px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {stock.ticker}
              </span>
            )}
            <span className={`text-xs font-display font-700 px-2 py-0.5 rounded-full ${
              article.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
              article.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {article.sentiment === 'positive' ? '🟢 Good News' :
               article.sentiment === 'negative' ? '🔴 Bad News' : '⚪ Neutral'}
            </span>
          </div>
          <h3 className="font-display font-800 text-gray-800 text-sm leading-snug">
            {article.headline}
          </h3>
          <p className="font-body text-gray-400 text-xs mt-0.5">{timeAgo(article.created_at)}</p>
        </div>
      </div>

      {expanded && (
        <p className="font-body text-gray-600 text-sm mb-3 leading-relaxed">{article.body}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-display font-700 text-kidbank-purple"
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
        {stock && (
          <button
            onClick={() => navigate('/dashboard/invest')}
            className="text-xs font-display font-700 text-gray-400 hover:text-kidbank-purple transition-colors"
          >
            See stock →
          </button>
        )}
      </div>
    </div>
  )
}

export default function NewsTab() {
  const [news, setNews] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
      supabase.from('stocks').select('*'),
    ]).then(([newsRes, stocksRes]) => {
      setNews(newsRes.data || [])
      setStocks(stocksRes.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="skeleton h-6 w-24 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-3xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-display font-900 text-gray-800 text-xl">Market News 📰</h2>

      {news.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-display font-700 text-gray-400">No news yet. Check back later!</p>
        </div>
      ) : (
        news.map((article) => (
          <NewsCard key={article.id} article={article} stocks={stocks} />
        ))
      )}
    </div>
  )
}
