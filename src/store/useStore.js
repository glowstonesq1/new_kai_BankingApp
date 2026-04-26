import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useStore = create((set, get) => ({
  // Auth
  session: null,
  user: null,
  profile: null,
  account: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setAccount: (account) => set({ account }),

  // Stocks
  stocks: [],
  setStocks: (stocks) => set({ stocks }),

  // Admin state
  kids: [],
  setKids: (kids) => set({ kids }),

  // Settings
  settings: {
    fd_interest_rate: 7,
    rd_interest_rate: 6,
    price_update_interval: 10,
    auto_price_updates: true,
    tx_delete_days: 30,
    stock_min_fluctuation: 2,
    stock_max_fluctuation: 8,
  },
  setSettings: (settings) => set({ settings }),

  // Initialize auth
  initAuth: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()
    set({ session })

    if (session?.user) {
      await get().loadProfile(session.user.id)
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session })
      if (session?.user) {
        await get().loadProfile(session.user.id)
      } else {
        set({ profile: null, account: null, loading: false })
      }
    })
  },

  loadProfile: async (userId) => {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile) {
      set({ profile })
      const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .single()
      set({ account })
    }
    set({ loading: false })
  },

  refreshAccount: async () => {
    const { profile } = get()
    if (!profile) return
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', profile.id)
      .single()
    set({ account })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null, account: null })
  },
}))

export default useStore
