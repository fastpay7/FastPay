import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Store, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function MerchantPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState({ businessName: '', businessType: '' })

  useEffect(() => {
    if (user?.role === 'merchant' || user?.merchantProfile) {
      Promise.all([
        api.get('/merchant/profile'),
        api.get('/merchant/settlements'),
      ]).then(([p, s]) => {
        setMerchant(p.data.merchant)
        setSettlements(s.data.settlements || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const register = async () => {
    if (!form.businessName || !form.businessType) return toast.error('Fill all fields')
    try {
      const { data } = await api.post('/merchant/register', form)
      setMerchant(data.merchant)
      toast.success('Merchant account created! 🎉')
    } catch (e) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const requestSettlement = async () => {
    try {
      await api.post('/merchant/settle')
      toast.success('Settlement requested!')
      const { data } = await api.get('/merchant/profile')
      setMerchant(data.merchant)
    } catch (e) { toast.error(e.response?.data?.error || 'No pending amount') }
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{
        padding: '52px 20px 24px',
        background: 'linear-gradient(160deg, #0A1A0A 0%, #0A0A0F 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Merchant Dashboard</h1>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 'unset', height: 200 }}>
            <div className="spinner" />
          </div>
        ) : !merchant ? (
          /* Register as Merchant */
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏪</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Become a Merchant</div>
              <div style={{ color: 'var(--text3)', fontSize: 14 }}>
                Accept UPI payments for your business and manage settlements
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Business Name</label>
                <input className="input" placeholder="My Awesome Store" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Business Type</label>
                <select
                  className="input"
                  value={form.businessType}
                  onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                  style={{ appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">Select type…</option>
                  {['Retail', 'Food & Beverage', 'Services', 'Healthcare', 'Education', 'E-commerce', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary btn-full" onClick={register}>
                <Store size={16} /> Register as Merchant
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { icon: '⚡', title: 'Instant', desc: 'Payments credited immediately' },
                { icon: '📊', title: 'Analytics', desc: 'Track earnings in real-time' },
                { icon: '🏦', title: 'Settlements', desc: 'Bank transfer in 24h' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="card" style={{ flex: 1, textAlign: 'center', padding: '14px 10px' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Merchant Dashboard */
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Business info */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(108,71,255,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>🏪</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{merchant.businessName}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{merchant.businessType}</div>
                <div style={{ fontSize: 13, color: 'var(--primary-light)', fontWeight: 600, marginTop: 2 }}>{merchant.upiId}</div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Total Earnings</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>₹{merchant.totalEarnings.toFixed(0)}</div>
              </div>
              <div className="card" style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Pending Settlement</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--primary-light)' }}>₹{merchant.pendingSettlement.toFixed(0)}</div>
              </div>
            </div>

            {merchant.pendingSettlement > 0 && (
              <button className="btn btn-primary btn-full" onClick={requestSettlement}>
                <DollarSign size={16} /> Request Settlement
              </button>
            )}

            {/* Settlement history */}
            <div>
              <div className="section-title">Settlement History</div>
              {settlements.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Clock size={36} />
                  <p>No settlements yet</p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {settlements.map((s, i) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      borderBottom: i < settlements.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: s.status === 'completed' ? 'rgba(46,213,115,0.15)' : 'rgba(255,165,2,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {s.status === 'completed' ? <CheckCircle size={18} color="var(--success)" /> : <Clock size={18} color="var(--warning)" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>₹{s.amount}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                          {format(new Date(s.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <span className={`badge badge-${s.status === 'completed' ? 'success' : 'warning'}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
