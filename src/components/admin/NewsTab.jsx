import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/formatCurrency'
import { STOCK_EMOJI } from '../../lib/stockHelpers'
import toast from 'react-hot-toast'

function parseCSV(text) {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += ch }
    }
    values.push(current.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/^"|"$/g, '') })
    return obj
  })
}

const SAMPLE_CSV = `ticker,headline,body,sentiment,price_impact_percent
SWE,Solar panels hit record efficiency,Scientists announced a breakthrough in photovoltaic technology.,positive,4.5
MBF,Disappointing Q3 earnings,Revenue fell short of analyst expectations by 12%.,negative,3.2
CNT,Cloud revenue surges 40%,Strong enterprise demand drives record quarterly results.,positive,6.1`

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

  // CSV state
  const [showCSV, setShowCSV] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvError, setCsvError] = useState('')
  const [csvPublish, setCsvPublish] = useState(false)
  const [importingCSV, setImportingCSV] = useState(false)
  const fileInputRef = useRef(null)

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
      if (form.publish_now && form.price_impact_percent !== 0) {
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
      toast.success(form.publish_now ? 'Article published! 📰' : 'Article saved as draft')
      setForm({ stock_id: '', headline: '', body: '', sentiment: 'neutral', price_impact_percent: 0, publish_now: true })
      setShowForm(false)
      await loadData()
    }
    setSubmitting(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        if (rows.length === 0) { setCsvError('No valid rows found in CSV.'); return }

        const required = ['ticker', 'headline', 'body', 'sentiment', 'price_impact_percent']
        const missing = required.filter((k) => !(k in rows[0]))
        if (missing.length > 0) {
          setCsvError(`Missing columns: ${missing.join(', ')}`)
          return
        }

        const enriched = rows.map((r) => ({
          ...r,
          stock: stocks.find((s) => s.ticker === r.ticker.toUpperCase()),
          price_impact_percent: parseFloat(r.price_impact_percent) || 0,
        }))
        setCsvRows(enriched)
      } catch {
        setCsvError('Failed to parse CSV. Check the format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleCSVImport = async () => {
    const validRows = csvRows.filter((r) => r.stock)
    if (validRows.length === 0) { toast.error('No rows with valid tickers'); return }

    setImportingCSV(true)
    let success = 0
    for (const row of validRows) {
      const { error } = await supabase.from('news').insert({
        stock_id: row.stock.id,
        headline: row.headline,
        body: row.body,
        sentiment: row.sentiment || 'neutral',
        price_impact_percent: row.price_impact_percent,
        is_published: csvPublish,
      })
      if (!error) {
        success++
        if (csvPublish && row.price_impact_percent !== 0) {
          const mult = row.sentiment === 'negative' ? -1 : 1
          const impact = Math.abs(row.price_impact_percent) * mult
          const { data: sd } = await supabase.from('stocks').select('current_price').eq('id', row.stock.id).single()
          if (sd) {
            const newPrice = +(sd.current_price * (1 + impact / 100)).toFixed(2)
            await supabase.from('stocks').update({
              previous_price: sd.current_price,
              current_price: newPrice,
              updated_at: new Date().toISOString(),
            }).eq('id', row.stock.id)
          }
        }
      }
    }
    toast.success(`Imported ${success} of ${validRows.length} articles! 📰`)
    setCsvRows([])
    setShowCSV(false)
    await loadData()
    setImportingCSV(false)
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_news.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display font-900 text-2xl text-gray-800">News</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowCSV(!showCSV); setShowForm(false) }}
            className="btn-secondary py-2.5 px-4 text-sm">
            📂 Upload CSV
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowCSV(false) }}
            className="btn-primary py-2.5 px-4">
            + Write Article
          </button>
        </div>
      </div>

      {/* CSV Upload panel */}
      {showCSV && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-800 text-gray-800">Bulk Upload via CSV</h2>
            <button onClick={downloadSample}
              className="text-sm font-display font-700 text-kidbank-purple hover:underline">
              ⬇️ Download Sample
            </button>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 text-xs font-mono text-gray-500 overflow-x-auto">
            ticker,headline,body,sentiment,price_impact_percent<br />
            SWE,"Solar breakthrough","Great news for solar…",positive,4.5
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 btn-secondary py-3"
            >
              📁 Choose CSV File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {csvError && (
            <p className="text-red-500 font-display font-700 text-sm">{csvError}</p>
          )}

          {csvRows.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Ticker', 'Headline', 'Sentiment', 'Impact%', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-display font-700 text-gray-500 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${!row.stock ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 font-display font-700 text-gray-700">{row.ticker}</td>
                        <td className="px-3 py-2 font-display text-gray-600 truncate max-w-[180px]">{row.headline}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-display font-700 px-2 py-0.5 rounded-full ${
                            row.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            row.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {row.sentiment}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-display font-700 text-gray-700">{row.price_impact_percent}%</td>
                        <td className="px-3 py-2 text-xs font-display font-700">
                          {row.stock
                            ? <span className="text-green-600">✓ Valid</span>
                            : <span className="text-red-500">✗ Unknown ticker</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="csv-publish"
                  checked={csvPublish}
                  onChange={(e) => setCsvPublish(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="csv-publish" className="font-display font-700 text-gray-600 text-sm">
                  Publish immediately (applies price impact)
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCSVImport}
                  disabled={importingCSV}
                  className="flex-1 btn-primary"
                >
                  {importingCSV ? 'Importing…' : `Import ${csvRows.filter((r) => r.stock).length} Articles 📰`}
                </button>
                <button onClick={() => { setCsvRows([]); setCsvError('') }} className="flex-1 btn-secondary">
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
