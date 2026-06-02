import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const FILTERS = ['all', 'transfer', 'qr_pay', 'cashback']

export default function HistoryPage() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const fetch = async (p = 1, type = filter) => {
    setLoading(true)
    try {
      if (type === 'cashback') {
        const { data } = await api.get('/rewards/history')
        setTxns(data.map(r => ({
          id: r.id,
          type: 'cashback',
          amount: r.amount,
          createdAt: r.createdAt,
          status: 'success',
          senderId: 'SYSTEM',
          receiverId: user?.id,
          sender: { name: 'FastPay Rewards', upiId: 'rewards@fastpay' },
          description: r.description
        })))
        setTotalPages(1)
        setPage(1)
      } else {
        const params = new URLSearchParams({ page: p, limit: 20 })
        if (type !== 'all') params.set('type', type)
        const { data } = await api.get(`/payments/history?${params}`)
        setTxns(data.transactions)
        setTotalPages(data.pages)
        setPage(p)
      }
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetch(1, filter) }, [filter])

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', background: 'var(--bg2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Transaction History</h1>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0,
                background: filter === f ? 'var(--primary)' : 'var(--bg3)',
                color: filter === f ? '#fff' : 'var(--text3)',
                border: filter === f ? 'none' : '1px solid var(--border)',
              }}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '65%' }} />
                  <div className="skeleton" style={{ height: 12, width: '45%' }} />
                </div>
                <div className="skeleton" style={{ height: 16, width: 64 }} />
              </div>
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="empty-state">
            <ArrowUpRight size={52} />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            {groupByDate(txns).map(({ date, items }) => (
              <div key={date} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', padding: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {date}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {items.map((tx, idx) => (
                    <TxItem key={tx.id} tx={tx} userId={user?.id} isLast={idx === items.length - 1} />
                  ))}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => fetch(page - 1)}>Prev</button>
                <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text3)' }}>{page} / {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => fetch(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TxItem({ tx, userId, isLast }) {
  const navigate = useNavigate()
  const isSent = tx.senderId === userId
  const other = isSent ? tx.receiver : tx.sender
  const initials = other?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <div onClick={() => navigate(`/user/${other?.upiId}`)} style={{
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="avatar avatar-sm">{initials}</div>
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 16, height: 16, borderRadius: '50%',
          background: isSent ? 'rgba(255,71,87,0.9)' : 'rgba(46,213,115,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg)',
        }}>
          {isSent
            ? <ArrowUpRight size={9} color="#fff" />
            : <ArrowDownLeft size={9} color="#fff" />
          }
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {other?.name || other?.upiId || 'Unknown'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
          {format(new Date(tx.createdAt), 'h:mm a')} · {tx.description || tx.type.replace('_', ' ')}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: isSent ? 'var(--danger)' : 'var(--success)' }}>
          {isSent ? '-' : '+'}₹{tx.amount}
        </div>
        {tx.cashbackAmount > 0 && isSent && (
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>+₹{tx.cashbackAmount} back</div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          <span className={`badge badge-${tx.status === 'success' ? 'success' : 'danger'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
            {tx.status}
          </span>
        </div>
      </div>
    </div>
  )
}

function groupByDate(txns) {
  const map = {}
  txns.forEach(tx => {
    const d = new Date(tx.createdAt)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    let label
    if (d.toDateString() === today.toDateString()) label = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday'
    else label = format(d, 'MMM d, yyyy')
    if (!map[label]) map[label] = []
    map[label].push(tx)
  })
  return Object.entries(map).map(([date, items]) => ({ date, items }))
}
