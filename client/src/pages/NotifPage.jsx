import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, BellOff } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import { getSocket } from '../lib/socket'

export default function NotifPage() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifs(r.data.notifications || [])
      setLoading(false)
    }).catch(() => setLoading(false))

    // Mark all read on open
    api.post('/notifications/read-all').catch(() => {})

    // Real-time new notifications
    const s = getSocket()
    const onNew = (data) => setNotifs(prev => [data, ...prev])
    s.on('notification', onNew)
    return () => s.off('notification', onNew)
  }, [])

  const ICONS = { payment: '💰', alert: '⚠️', promo: '🎁' }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '52px 20px 20px', background: 'var(--bg2)' }}>
        <button className="btn btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h1>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <BellOff size={52} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div style={{ marginTop: 4 }}>
            {notifs.map((n, i) => (
              <div key={n.id || i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '14px 0',
                borderBottom: i < notifs.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: n.read ? 0.65 : 1,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {ICONS[n.type] || '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {n.title}
                    {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>
                    {format(new Date(n.createdAt), 'MMM d · h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
