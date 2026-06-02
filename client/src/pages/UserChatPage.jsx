import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function UserChatPage() {
  const { identifier } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [otherUser, setOtherUser] = useState(null)
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: userData }, { data: historyData }] = await Promise.all([
          api.get(`/users/lookup/${identifier}`),
          api.get(`/payments/history?withUser=${identifier}&limit=50`)
        ])
        setOtherUser(userData)
        // Reverse so chronological order (oldest top, newest bottom) like chat
        setTxns(historyData.transactions.reverse())
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [identifier])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!otherUser) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}><ChevronLeft size={16} /> Back</button>
      <p style={{ marginTop: 20, color: 'var(--text3)' }}>User not found</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 16px', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn-icon btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <div className="avatar avatar-sm">{otherUser.name[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{otherUser.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{otherUser.phone}</div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {txns.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', marginTop: 40, fontSize: 14 }}>
            No past transactions with {otherUser.name}. Say hi by sending some money!
          </div>
        )}
        {txns.map(tx => {
          const isSent = tx.senderId === user?.id
          return (
            <div key={tx.id} style={{ alignSelf: isSent ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{
                background: isSent ? 'var(--primary)' : 'var(--bg3)',
                color: isSent ? '#fff' : 'var(--text1)',
                padding: '12px 16px',
                borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>₹{tx.amount}</div>
                {tx.description && <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>{tx.description}</div>}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                  {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                  {isSent && <div style={{ width: 4, height: 4, borderRadius: 2, background: 'currentColor' }} />}
                  {isSent && <span style={{ textTransform: 'capitalize' }}>{tx.status}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Bar */}
      <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary btn-full" onClick={() => navigate(`/send?to=${identifier}`)}>
          Pay {otherUser.name} <Send size={16} />
        </button>
      </div>
    </div>
  )
}
