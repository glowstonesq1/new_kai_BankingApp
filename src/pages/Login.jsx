import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import useStore from '../store/useStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loadProfile } = useStore()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password')
      return
    }

    setLoading(true)
    try {
      // Sign in first — RLS blocks reading public.users before auth
      const email = `${username.trim().toLowerCase()}@kidbank.app`
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast.error('Wrong username or password. Try again!')
        return
      }

      // Now authenticated — RLS allows reading own profile
      const { data: userRecord, error: lookupError } = await supabase
        .from('users')
        .select('id, role, is_frozen')
        .eq('id', data.user.id)
        .single()

      if (lookupError || !userRecord) {
        await supabase.auth.signOut()
        toast.error('Account not set up. Contact admin.')
        return
      }

      if (userRecord.is_frozen) {
        await supabase.auth.signOut()
        toast.error('Your account has been frozen. Contact admin.')
        return
      }

      await loadProfile(data.user.id)
      toast.success(`Welcome back! 🎉`)
      navigate(userRecord.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      toast.error('Something went wrong. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-64 h-64 bg-kidbank-purple opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-kidbank-pink opacity-10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3 filter drop-shadow-lg">🏦</div>
          <h1 className="font-display font-900 text-4xl text-kidbank-purple">KidBank</h1>
          <p className="font-display font-600 text-gray-500 mt-1">Your money, your future! 🚀</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
          <h2 className="font-display font-800 text-xl text-gray-800 mb-6 text-center">
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. arjun123"
                className="input-field"
                autoCapitalize="none"
                autoCorrect="off"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block font-display font-700 text-gray-600 text-sm mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-kidbank-purple to-purple-500 text-white
                         font-display font-800 py-4 rounded-2xl shadow-lg mt-2
                         active:scale-95 transition-all duration-150
                         disabled:opacity-60 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign In 🎯'
              )}
            </button>
          </form>
        </div>

        <p className="text-center font-display text-gray-400 text-sm mt-6">
          Don't have an account? Ask your admin! 😊
        </p>

        <div className="flex justify-center gap-4 mt-4 text-2xl opacity-60">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>💰</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>📈</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>🌟</span>
          <span className="animate-bounce" style={{ animationDelay: '450ms' }}>🎯</span>
        </div>
      </div>
    </div>
  )
}
