import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '../components/admin/AdminLayout'
import OverviewTab from '../components/admin/OverviewTab'
import KidsTab from '../components/admin/KidsTab'
import DepositTab from '../components/admin/DepositTab'
import MarketTab from '../components/admin/MarketTab'
import AdminNewsTab from '../components/admin/NewsTab'
import SettingsTab from '../components/admin/SettingsTab'

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewTab />} />
        <Route path="kids" element={<KidsTab />} />
        <Route path="deposit" element={<DepositTab />} />
        <Route path="market" element={<MarketTab />} />
        <Route path="news" element={<AdminNewsTab />} />
        <Route path="settings" element={<SettingsTab />} />
      </Route>
    </Routes>
  )
}
