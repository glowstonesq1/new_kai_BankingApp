import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/formatCurrency'
import { STOCK_EMOJI } from '../../lib/stockHelpers'
import toast from 'react-hot-toast'

export default function AdminNewsTab() {
  const [stocks, setStocks] = useState([])
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    stock_id: '',
    headline: '',
    body: '',
    sentiment: 'neutral',
    price_impact_percent: 0,
    publish_now: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [stocksRes, newsRes] = await Promise.all([
      supabase.from('stocks').select('id, company_name, ticker'),
      supabase
        .from('news')
        .select('*, stocks(company_name, ticker)')
        .order('created_at', { ascending: false }),
    ])
    setStocks(stocksRes.data || [])
    setNews(newsRes.data || [])
    setLoading(false)
  }

  const handlePublish = async (newsId, stock) => {
    const article = news.find((n) => n.id === newsId)
    if (!article) return

    await supabase.from('news').update({ is_published: true }).eq('id', newsId)

    // Apply price impact
    if (stock && article.price_impact_percent !== 0) {
      const impactMultiplier = article.sentiment === 'negative' ? -1 : 1
      const impact = Math.abs(article.price_impact_percent) * impactMultiplier
      const { data: stockData } = await supabase.from('stocks').select('current_price').eq('id', article.stock_id).single()
      if (stockData) {
        const newPrice = +(stockData.current_price * (1 + impact / 100)).toFixed(2)
        await supabase.from('stocks').update({
          previous_price: stockData.current_price,
          current_price: newPrice,
          updated_at: new Date().toISOString(),
        }).eq('id', article.stock_id)
      }
    }

    toast.success('Article published! 📰')
    await loadData()
  }

  const handleDelete = async (id) => {
    await supabase.from('news').delete().eq('id', id)
    setDeletingId(null)
    toast.success('Article deleted')
    await loadData()
  }

  const handleCreate = async () => {
    if (!form.stock_id) { toast.error('Select a stock'); return }
    if (!form.headline.trim()) { toast.error('Enter a headline'); return }
    if (!form.body.trim()) { toast.error('Enter article body'); return }

    setSubmitting(true)
    const { error } = await supabase.from('news').insert({
      stock_id: form.stock_id,
      headline: form.headline.trim(),
      body: form.body.trim(),
      sentiment: form.sentiment,
      price_impact_percent: Number(form.price_impact_percent),
      is_published: form.publish_now,
    })

    if (error) {
      toast.error('Failed to create article')
    } else {
      if (form.publish_now) {
        const stock = stocks.find((s) => s.id === form.stock_id)
        // Apply price impact immediately
        if (form.price_impact_percent !== 0) {
          const impactMultiplier = form.sentiment === 'negative' ? -1 : 1
          const impact = Math.abs(Number(form.price_impact_percent)) * impactMultiplier
          const { data: stockData } = await supabase.from('stocks').select('current_price').eq('id', form.stock_id).single()
          if (stockData) {
            const newPrice = +(stockData.current_price * (1 + impact / 100)).toFixed(2)
            await supabase.from('stocks').update({
              previous_price: stockData.current_price,
              current_price: newPrice,
              updated_at: new Date().toISOString(),
            }).eq('id', form.stock_id)
          }
        }
      }
      toast.success(form.publish_now ? 'Article published! 📰' : 'Article saved as draft')
      setForm({ stock_id: '', headline: '', body: '', sentiment: 'neutral', price_impact_percent: 0, publish_now: true })
      setShowForm(false)
      await loadData()
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-900 text-2xl text-gray-800">News</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2.5 px-4">
          + Write Article
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-display font-800 text-gray-800">New Article</h2>

          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Company</label>
            <select
              value={form.stock_id}
              onChange={(e) => setForm({ ...form, stock_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select company…</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>{s.company_name} ({s.ticker})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Headline</label>
            <input
              type="text"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="Catchy headline…"
              className="input-field"
            />
          </div>

          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Full article text…"
              rows={4}
              className="input-field resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-display font-700 text-gray-500 text-sm mb-1">Sentiment</label>
              <select
                value={form.sentiment}
                onChange={(e) => setForm({ ...form, sentiment: e.target.value })}
                className="input-field"
              >
                <option value="positive">🟢 Positive</option>
                <option value="negative">🔴 Negative</option>
                <option value="neutral">⚪ Neutral</option>
              </select>
            </div>
            <div>
              <label className="block font-display font-700 text-gray-500 text-sm mb-1">Price Impact %</label>
              <input
                type="number"
                value={form.price_impact_percent}
                onChange={(e) => setForm({ ...form, price_impact_percent: e.target.value })}
                placeholder="e.g. 5.2 or -3.1"
                className="input-field"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="publish-now"
              checked={form.publish_now}
              onChange={(e) => setForm({ ...form, publish_now: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="publish-now" className="font-display font-700 text-gray-600 text-sm">
              Publish immediately (applies price impact now)
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={submitting} className="flex-1 btn-primary">
              {submitting ? 'Saving…' : form.publish_now ? 'Publish 📰' : 'Save Draft'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* News list */}
      <div className="space-y-3">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)
          : news.map((article) => {
              const stock = article.stocks
              return (
                <div key={article.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {stock && (
                          <span className="text-xs font-display font-700 bg-purple-100 text-kidbank-purple px-2 py-0.5 rounded-full">
                            {STOCK_EMOJI[stock.ticker]} {stock.ticker}
                          </span>
                        )}
                        <span className={`text-xs font-display font-700 px-2 py-0.5 rounded-full ${
                          article.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          article.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {article.sentiment === 'positive' ? '🟢' : article.sentiment === 'negative' ? '🔴' : '⚪'} {article.sentiment}
                        </span>
                        {article.is_published
                          ? <span className="text-xs font-display font-700 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                          : <span className="text-xs font-display font-700 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>}
                      </div>
                      <p className="font-display font-800 text-gray-800 mb-1">{article.headline}</p>
                      <p className="font-body text-gray-500 text-sm line-clamp-2">{article.body}</p>
                      <p className="font-body text-gray-400 text-xs mt-1">{timeAgo(article.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {!article.is_published && (
                        <button
                          onClick={() => handlePublish(article.id, stock)}
                          className="bg-green-500 text-white font-display font-700 px-3 py-1.5 rounded-xl text-sm"
                        >
                          Publish
                        </button>
                      )}
                      {deletingId === article.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="bg-red-500 text-white font-display font-700 px-2 py-1.5 rounded-xl text-xs"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="bg-gray-200 text-gray-600 font-display font-700 px-2 py-1.5 rounded-xl text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(article.id)}
                          className="bg-red-100 text-red-600 font-display font-700 px-3 py-1.5 rounded-xl text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
