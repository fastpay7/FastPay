import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, Minus, Gift, Star, TrendingUp, Shield, CheckCircle, Clock, XCircle, ArrowDownToLine, Eye, EyeOff, Landmark } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const VerificationBadge = ({ status }) => {
  if (status === 'verified') return <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--success)', fontSize:12, fontWeight:600 }}><CheckCircle size={13} /> Verified</span>
  if (status === 'failed')   return <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--danger)',  fontSize:12, fontWeight:600 }}><XCircle size={13} /> Failed</span>
  return <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text3)', fontSize:12 }}><Clock size={13} /> Pending</span>
}

export default function WalletPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'rewards' ? 'rewards' : 'banks')
  const [rewards, setRewards] = useState([])
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingBank, setAddingBank] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [ifscLoading, setIfscLoading] = useState(false)
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', ifscCode: '', accountHolder: '' })
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/rewards'),
      api.get('/bank'),
    ]).then(([r, b]) => {
      setRewards(r.data.rewards || [])
      setBanks(b.data.accounts || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // IFSC auto-lookup when 11 chars entered
  const handleIfscChange = async (val) => {
    const ifsc = val.toUpperCase()
    setBankForm(f => ({ ...f, ifscCode: ifsc }))
    if (ifsc.length === 11) {
      setIfscLoading(true)
      try {
        const { data } = await api.get(`/bank/ifsc/${ifsc}`)
        setBankForm(f => ({ ...f, bankName: data.bank, ifscCode: ifsc }))
        toast.success(`${data.bank} — ${data.branch}`)
      } catch {
        toast.error('IFSC not found. Check and re-enter.')
        setBankForm(f => ({ ...f, bankName: '' }))
      } finally { setIfscLoading(false) }
    }
  }

  const linkBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolder)
      return toast.error('Fill all fields')
    const loadingToast = toast.loading('Verifying account with bank…')
    try {
      const { data } = await api.post('/bank', bankForm)
      setBanks(prev => [...prev, data.account])
      setBankForm({ bankName: '', accountNumber: '', ifscCode: '', accountHolder: '' })
      setAddingBank(false)
      toast.dismiss(loadingToast)
      toast.success(data.message || 'Bank account linked!')
    } catch (e) {
      toast.dismiss(loadingToast)
      toast.error(e.response?.data?.error || 'Failed')
    }
  }

  const setDefaultBank = async (id) => {
    try {
      await api.post('/bank/set-default', { accountId: id })
      setBanks(banks.map(b => ({ ...b, isDefault: b.id === id })))
      toast.success('Primary account updated')
    } catch (e) { toast.error('Failed to set primary') }
  }

  const removeBank = async (id) => {
    if (!window.confirm('Remove this bank account?')) return
    try {
      await api.delete(`/bank/${id}`)
      setBanks(banks.filter(b => b.id !== id))
      if (selectedBank?.id === id) setSelectedBank(null)
      toast.success('Account removed')
    } catch (e) { toast.error('Failed to remove account') }
  }



  const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{
        padding: '52px 20px 24px',
        background: 'linear-gradient(160deg, #0D1A0A 0%, #0A0A0F 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Balance & Rewards</h1>
        </div>

        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(46,213,115,0.15) 0%, rgba(0,212,170,0.1) 100%)',
          border: '1px solid rgba(46,213,115,0.2)',
          borderRadius: 20, padding: '20px 22px',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Bank Balance</div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>
            ₹{(user?.walletBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 20px 0' }}>
        <div className="tabs">
          <button className={`tab-btn${tab === 'banks' ? ' active' : ''}`} onClick={() => setTab('banks')}>Bank Accounts</button>
          <button className={`tab-btn${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>
            Rewards {totalRewards > 0 && <span style={{ background: 'var(--accent)', borderRadius: 6, padding: '1px 6px', fontSize: 11, marginLeft: 4, color: '#000', fontWeight: 700 }}>₹{totalRewards.toFixed(0)}</span>}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* REWARDS TAB */}
        {tab === 'rewards' && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 12px', background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>₹{totalRewards.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Total Earned</div>
              </div>
              <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 12px', background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{rewards.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Rewards</div>
              </div>
            </div>

            {rewards.length === 0 ? (
              <div className="empty-state"><Gift size={48} /><p>No rewards yet — start transacting!</p></div>
            ) : rewards.map(r => (
              <div key={r.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: r.type === 'cashback' ? 'rgba(0,212,170,0.15)' : r.type === 'referral_bonus' ? 'rgba(108,71,255,0.15)' : 'rgba(255,165,2,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {r.type === 'cashback' ? '💸' : r.type === 'referral_bonus' ? '👥' : '🎉'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: 16 }}>+₹{r.amount}</div>
              </div>
            ))}
          </div>
        )}

        {/* BANKS TAB */}
        {tab === 'banks' && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {banks.length === 0 && !addingBank && (
              <div className="empty-state"><Star size={48} /><p>Link a bank account to enable UPI payments</p></div>
            )}

            {banks.map(b => (
              <div key={b.id} className="card card-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,71,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {b.bankName}
                    {b.isDefault && <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: 10 }}>Primary</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>••••{b.accountNumber.slice(-4)} {b.branchName ? `· ${b.branchName}` : ''}</div>
                  <div style={{ marginTop: 4, marginBottom: 10 }}><VerificationBadge status={b.verificationStatus} /></div>
                  
                  <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {!b.isDefault && (
                      <button className="btn btn-sm" style={{ background: 'transparent', padding: 0, color: 'var(--primary-light)', fontSize: 12 }} onClick={() => setDefaultBank(b.id)}>
                        Set as Primary
                      </button>
                    )}
                    <button className="btn btn-sm" style={{ background: 'transparent', padding: 0, color: 'var(--danger)', fontSize: 12 }} onClick={() => removeBank(b.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}



            {addingBank ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Link Bank Account</div>

                {/* IFSC — auto-fills bank name */}
                <div className="input-group">
                  <label className="input-label">IFSC Code {ifscLoading && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· looking up…</span>}</label>
                  <input className="input" placeholder="SBIN0001234" value={bankForm.ifscCode}
                    onChange={e => handleIfscChange(e.target.value)} maxLength={11} />
                </div>

                {/* Bank name — auto-filled from IFSC */}
                <div className="input-group">
                  <label className="input-label">Bank Name</label>
                  <input className="input" placeholder="Auto-filled from IFSC" value={bankForm.bankName}
                    onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Account Holder Name</label>
                  <input className="input" placeholder="Rahul Sharma" value={bankForm.accountHolder}
                    onChange={e => setBankForm(f => ({ ...f, accountHolder: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Account Number</label>
                  <input className="input" placeholder="1234567890" value={bankForm.accountNumber}
                    onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} />
                </div>

                <div style={{ fontSize: 12, color: 'var(--text3)', background: 'rgba(108,71,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  🔍 We'll run a ₹1 penny-drop to verify your account is real.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddingBank(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={linkBank}>Verify & Link</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary btn-full" onClick={() => setAddingBank(true)}>
                <Plus size={16} /> Link Bank Account
              </button>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
