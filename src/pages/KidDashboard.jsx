import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import KidLayout from '../components/kid/KidLayout'
import HomeTab from '../components/kid/HomeTab'
import InvestTab from '../components/kid/InvestTab'
import PayTab from '../components/kid/PayTab'
import KidNewsTab from '../components/kid/NewsTab'
import GoalsTab from '../components/kid/GoalsTab'
import FinancialReport from './FinancialReport'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

export default function KidDashboard() {
  const { setStocks } = useStore()

  useEffect(() => {
    supabase.from('stocks').select('*').then(({ data }) => {
      if (data) setStocks(data)
    })
  }, [setStocks])

  return (
    <Routes>
      <Route element={<KidLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomeTab />} />
        <Route path="invest" element={<InvestTab />} />
        <Route path="pay" element={<PayTab />} />
        <Route path="news" element={<KidNewsTab />} />
        <Route path="goals" element={<GoalsTab />} />
        <Route path="report" element={<FinancialReport />} />
      </Route>
    </Routes>
  )
}
