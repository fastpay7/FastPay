import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'

import Layout        from './components/Layout'
import LoginPage     from './pages/LoginPage'
import HomePage      from './pages/HomePage'
import SendPage      from './pages/SendPage'
import QRPage        from './pages/QRPage'
import HistoryPage   from './pages/HistoryPage'
import WalletPage    from './pages/WalletPage'
import ProfilePage   from './pages/ProfilePage'
import NotifPage     from './pages/NotifPage'
import MerchantPage  from './pages/MerchantPage'
import UserChatPage  from './pages/UserChatPage'
import AccountDetailsPage from './pages/AccountDetailsPage'
import ChangePinPage from './pages/ChangePinPage'

function ProtectedRoute({ children }) {
  const { token, loading } = useAuthStore()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading FastPay…</p>
    </div>
  )
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe)

  useEffect(() => { fetchMe() }, [fetchMe])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="send"     element={<SendPage />} />
            <Route path="qr"       element={<QRPage />} />
            <Route path="history"  element={<HistoryPage />} />
            <Route path="wallet"   element={<WalletPage />} />
            <Route path="profile"  element={<ProfilePage />} />
            <Route path="account"  element={<AccountDetailsPage />} />
            <Route path="change-pin" element={<ChangePinPage />} />
            <Route path="notif"    element={<NotifPage />} />
            <Route path="merchant" element={<MerchantPage />} />
            <Route path="user/:identifier" element={<UserChatPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
