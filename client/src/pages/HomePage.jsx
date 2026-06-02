import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, QrCode, CreditCard, Gift, Bell, User, TrendingUp, ChevronRight, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { getSocket } from '../lib/socket'
import api from '../lib/api'

export default function HomePage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [txns, setTxns] = useState([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get('/payments/history?limit=5').then(r => {
      setTxns(r.data.transactions)
      setLoadingTx(false)
    }).catch(() => setLoadingTx(false))

    api.get('/notifications').then(r => setUnread(r.data.unread)).catch(() => {})

    // Real-time balance updates
    const s = getSocket()
    const refresh = async () => {
      try {
        const { data } = await api.get('/users/me')
        setUser(data)
      } catch {}
    }
    s.on('payment:sent', (d) => {
      toast.success(`₹${d.amount} sent!`)
      refresh()
      setTxns(prev => [d.tx, ...prev.slice(0, 4)])
    })
    s.on('payment:received', (d) => {
      toast.success(`₹${d.amount} received from ${d.sender?.name || 'someone'}!`, { icon: '💰' })
      setUnread(u => u + 1)
      refresh()
    })
    return () => { s.off('payment:sent'); s.off('payment:received') }
  }, [])

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FP'

  const QUICK = [
    { icon: <ArrowUpRight size={22} />, label: 'Send', color: '#6C47FF', bg: 'rgba(108,71,255,0.15)', to: '/send' },
    { icon: <QrCode size={22} />, label: 'QR Pay', color: '#00D4AA', bg: 'rgba(0,212,170,0.15)', to: '/qr' },
    { icon: <CreditCard size={22} />, label: 'Wallet', color: '#FFA502', bg: 'rgba(255,165,2,0.15)', to: '/wallet' },
    { icon: <Gift size={22} />, label: 'Rewards', color: '#FF4757', bg: 'rgba(255,71,87,0.15)', to: '/wallet?tab=rewards' },
  ]

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, #1A0A3E 0%, #0D0D1A 100%)',
        padding: '52px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,71,255,0.2) 0%, transparent 70%)',
          top: -100, right: -80, pointerEvents: 'none',
        }} />

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img 
              src="/logo.png" 
              alt="FastPay" 
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10 }} 
            />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Good {greeting()}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.name?.split(' ')[0] || 'User'} 👋</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-icon btn" onClick={() => navigate('/notif')} style={{ position: 'relative' }}>
              <Bell size={18} />
              {unread > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -2,
                  background: 'var(--danger)', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  height: 16, minWidth: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid var(--bg2)'
                }}>
                  {unread > 99 ? '99+' : unread}
                </div>
              )}
            </button>
            <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none' }}>
              <div className="avatar avatar-sm">{initials}</div>
            </button>
          </div>
        </div>

        {/* Balance card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '20px 22px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginBottom: 6 }}>Bank Balance</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1 }}>
              {balanceVisible ? `₹${(user?.walletBalance || 0).toFixed(2)}` : '₹ ••••••'}
            </div>
            <button
              onClick={() => setBalanceVisible(v => !v)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text3)', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}
            >{balanceVisible ? 'Hide' : 'Show'}</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
            UPI: <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{user?.upiId}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          {QUICK.map(({ icon, label, color, bg, to }) => (
            <button key={label} className="quick-tile" onClick={() => navigate(to)}>
              <div className="quick-tile-icon" style={{ background: bg, color }}>
                {icon}
              </div>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* UPI ID Banner */}
      <div style={{ padding: '20px 20px 0' }}>
        <div className="card card-sm" style={{
          background: 'linear-gradient(135deg, rgba(108,71,255,0.12), rgba(0,212,170,0.08))',
          border: '1px solid rgba(108,71,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Your UPI ID</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-light)' }}>{user?.upiId}</div>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => { navigator.clipboard.writeText(user?.upiId); toast.success('Copied!') }}
          >Copy</button>
        </div>
      </div>

      {/* Cashback banner */}
      <div style={{ padding: '16px 20px 0' }}>
        <div className="card card-sm" style={{
          background: 'linear-gradient(135deg, rgba(255,165,2,0.12), rgba(255,71,87,0.08))',
          border: '1px solid rgba(255,165,2,0.2)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>🎁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>1.5% Cashback on every payment!</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Credited instantly to your wallet</div>
          </div>
          <TrendingUp size={16} color="var(--warning)" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="section-title" style={{ margin: 0 }}>Recent Activity</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        {loadingTx ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
                <div className="skeleton" style={{ height: 16, width: 60 }} />
              </div>
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="empty-state">
            <ArrowUpRight size={48} />
            <p>No transactions yet. Send your first payment!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {txns.map(tx => <TxRow key={tx.id} tx={tx} userId={user?.id} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function TxRow({ tx, userId }) {
  const navigate = useNavigate()
  const isSent = tx.senderId === userId
  const other = isSent ? tx.receiver : tx.sender
  const initials = other?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <div onClick={() => navigate(`/user/${other?.upiId}`)} style={{
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
      padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div className="avatar avatar-sm" style={{ fontSize: 12 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {other?.name || other?.upiId}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {format(new Date(tx.createdAt), 'MMM d · h:mm a')}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: isSent ? 'var(--danger)' : 'var(--success)' }}>
          {isSent ? '-' : '+'}₹{tx.amount}
        </div>
        {tx.cashbackAmount > 0 && isSent && (
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>+₹{tx.cashbackAmount} back</div>
        )}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
