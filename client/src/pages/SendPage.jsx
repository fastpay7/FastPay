import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Search, Send, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const PRESETS = [100, 200, 500, 1000, 2000, 5000]

export default function SendPage() {
  const [identifier, setIdentifier] = useState('')
  const [receiverInfo, setReceiverInfo] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('search') // search | amount | pin | result
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { setUser, user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Auto-lookup if ?to= is present in URL
  useState(() => {
    const to = searchParams.get('to')
    if (to) {
      setIdentifier(to)
      // Call api directly since state might not be updated yet
      setLoading(true)
      api.get(`/users/lookup/${to}`).then(({ data }) => {
        setReceiverInfo(data)
        setStep('amount')
      }).catch(e => {
        toast.error(e.response?.data?.error || 'User not found')
      }).finally(() => setLoading(false))
    }
  })

  const handleLookup = async () => {
    if (!identifier || identifier.length < 3) return toast.error('Enter valid phone or UPI ID')
    setLoading(true)
    try {
      const { data } = await api.get(`/users/lookup/${identifier}`)
      setReceiverInfo(data)
      setStep('amount')
    } catch (e) {
      toast.error(e.response?.data?.error || 'User not found')
    } finally {
      setLoading(false)
    }
  }

  const goPin = () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount')
    if (parseFloat(amount) > (user?.walletBalance || 0)) return toast.error('Insufficient balance')
    setPin('')
    setStep('pin')
  }

  const sendMoney = async () => {
    if (pin.length !== 6) return toast.error('Enter 6-digit PIN')
    setLoading(true)
    try {
      const { data } = await api.post('/payments/send', {
        upiId: receiverInfo.upiId, amount: parseFloat(amount), description: note, pin,
      })
      setResult({ ok: true, data })
      setStep('result')
      // refresh balance
      api.get('/users/me').then(r => setUser(r.data)).catch(() => {})
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.error || 'Payment failed' })
      setStep('result')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '52px 20px 20px' }}>
        <button className="btn btn-icon" onClick={() => step === 'pin' ? setStep('form') : navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>
          {step === 'search' ? 'Find Receiver' : step === 'pin' ? 'Enter PIN' : 'Send Money'}
        </h1>
      </div>

      <div style={{ padding: '0 20px', flex: 1 }}>

        {/* STEP: Search */}
        {step === 'search' && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>Who are you paying?</div>
              <div className="input-group">
                <label className="input-label">Phone Number or UPI ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    placeholder="e.g. 9876543210 or name@fastpay"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    style={{ paddingRight: 44, fontSize: 16 }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleLookup} disabled={loading} style={{ marginTop: 10 }}>
                {loading ? <span className="spinner" /> : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Amount */}
        {step === 'amount' && receiverInfo && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Verified Receiver Card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700 }}>
                {receiverInfo.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15 }}>
                  {receiverInfo.name} <CheckCircle size={14} color="var(--success)" />
                </div>
                {receiverInfo.bankInfo ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    🏦 {receiverInfo.bankInfo.accountHolder} · {receiverInfo.bankInfo.bankName} ****{receiverInfo.bankInfo.last4}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    📱 {receiverInfo.phone} · Bank Transfer
                  </div>
                )}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <div className="input-prefix">
                <span className="prefix">₹</span>
                <input
                  className="input"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ fontSize: 24, fontWeight: 700 }}
                  autoFocus
                />
              </div>
            </div>

            {/* Preset amounts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.map(p => (
                <button
                  key={p}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 'var(--radius-full)' }}
                  onClick={() => setAmount(String(p))}
                >₹{p}</button>
              ))}
            </div>

            <div className="input-group">
              <label className="input-label">Note (optional)</label>
              <input className="input" placeholder="Dinner, rent, split…" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* Balance */}
            <div style={{
              background: 'var(--bg3)', borderRadius: 'var(--radius-md)', padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>Bank Balance</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>₹{(user?.walletBalance || 0).toFixed(2)}</span>
            </div>

            {amount && (
              <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
                <span style={{ color: 'var(--accent)', fontSize: 13 }}>
                  🎁 You'll earn ₹{(parseFloat(amount || 0) * 0.015).toFixed(2)} cashback!
                </span>
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={goPin}>
              Proceed to Pay <Send size={16} />
            </button>
          </div>
        )}

        {/* STEP: PIN */}
        {step === 'pin' && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Sending to</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{receiverInfo?.name}</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, marginTop: 8 }}>₹{amount}</div>
              {note && <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>{note}</div>}
              {receiverInfo?.bankInfo && (
                <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                  🏦 To {receiverInfo.bankInfo.bankName} ****{receiverInfo.bankInfo.last4}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Enter your UPI PIN</div>
              <div className="pin-dots">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
                ))}
              </div>
            </div>

            {/* Hidden input trick */}
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/,''))}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              autoFocus
            />

            {/* Number pad */}
            <NumPad value={pin} onChange={setPin} onSubmit={sendMoney} />

            <button
              className="btn btn-primary btn-full"
              onClick={sendMoney}
              disabled={loading || pin.length !== 6}
            >
              {loading ? <span className="spinner" /> : `Pay ₹${amount}`}
            </button>
          </div>
        )}

        {/* STEP: Result */}
        {step === 'result' && result && (
          <div className="result-overlay">
            <div className="result-card slide-up">
              <div className={`result-icon ${result.ok ? 'success' : 'fail'}`}>
                {result.ok ? <CheckCircle size={40} color="var(--success)" /> : <XCircle size={40} color="var(--danger)" />}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                {result.ok ? 'Payment Sent!' : 'Payment Failed'}
              </div>
              {result.ok ? (
                <>
                  <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>₹{amount}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 8 }}>to {receiverInfo?.name}</div>
                  <div style={{ background: 'rgba(0,212,170,0.1)', borderRadius: 10, padding: '10px 16px', marginBottom: 20 }}>
                    <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
                      🎁 ₹{result.data?.cashback} cashback added!
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 20 }}>{result.msg}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/')}>Home</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setStep('search'); setResult(null); setPin(''); }}>
                  {result.ok ? 'Send Again' : 'Try Again'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NumPad({ value, onChange, onSubmit }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  const tap = (k) => {
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (k && value.length < 6) onChange(value + k)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '0 auto' }}>
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => tap(k)}
          style={{
            height: 60, borderRadius: 14, fontSize: k === '⌫' ? 20 : 22, fontWeight: 700,
            background: k ? 'var(--bg3)' : 'transparent',
            color: k === '⌫' ? 'var(--text3)' : 'var(--text1)',
            border: k ? '1px solid var(--border)' : 'none',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >{k}</button>
      ))}
    </div>
  )
}
