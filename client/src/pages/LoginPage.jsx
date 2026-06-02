import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Zap, ArrowRight, ChevronLeft } from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const STEP = { PHONE: 'phone', OTP: 'otp', REGISTER: 'register' }

export default function LoginPage() {
  const [step, setStep] = useState(STEP.PHONE)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [tempToken, setTempToken] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [referral, setReferral] = useState('')
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef([])
  const navigate = useNavigate()
  const { setToken, fetchMe } = useAuthStore()

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) return toast.error('Enter a valid 10-digit number')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/send-otp', { phone })
      toast.success('OTP sent to your number!')
      if (data.devOtp) {
        const arr = data.devOtp.split('')
        setOtp(arr)
        toast('🔧 Dev OTP auto-filled', { icon: '🛠' })
      }
      setStep(STEP.OTP)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== 6) return toast.error('Enter 6-digit OTP')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code })
      if (data.isNewUser) {
        setTempToken(data.tempToken)
        setStep(STEP.REGISTER)
      } else {
        setToken(data.token)
        await fetchMe()
        navigate('/')
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const register = async () => {
    if (!name.trim()) return toast.error('Enter your name')
    if (!/^\d{6}$/.test(pin)) return toast.error('PIN must be 6 digits')
    if (pin !== confirmPin) return toast.error('PINs do not match')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name, pin, referralCode: referral }, {
        headers: { Authorization: `Bearer ${tempToken}` },
      })
      setToken(data.token)
      await fetchMe()
      toast.success(`Welcome to FastPay, ${name}! 🎉`)
      navigate('/')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter') verifyOtp()
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #1A0A3E 0%, #0A0A0F 60%)',
        padding: '60px 28px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* glow blobs */}
        <div style={{
          position: 'absolute', width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,71,255,0.25) 0%, transparent 70%)',
          top: -80, right: -60, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.15) 0%, transparent 70%)',
          bottom: 0, left: -40, pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#6C47FF,#00D4AA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>FastPay</span>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, marginBottom: 10 }}>
          India's fastest<br />
          <span className="gradient-text">UPI payments</span>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>
          Send, receive & earn cashback instantly
        </p>
      </div>

      {/* Form area */}
      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* STEP: Phone */}
        {step === STEP.PHONE && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Get started</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>Enter your mobile number to continue</p>
            </div>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  background: 'var(--bg3)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '14px 14px',
                  color: 'var(--text3)', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap',
                }}>🇮🇳 +91</div>
                <input
                  className="input"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  autoFocus
                />
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={sendOtp} disabled={loading}>
              {loading ? <span className="spinner" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {/* STEP: OTP */}
        {step === STEP.OTP && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn-icon btn" onClick={() => setStep(STEP.PHONE)}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Verify OTP</h2>
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sent to +91 {phone}</p>
              </div>
            </div>
            <div className="otp-row">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={el => (otpRefs.current[i] = el)}
                  className="otp-box"
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKey(e, i)}
                />
              ))}
            </div>
            <button className="btn btn-primary btn-full" onClick={verifyOtp} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Verify & Continue'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={sendOtp} style={{ fontSize: 13 }}>
              Resend OTP
            </button>
          </div>
        )}

        {/* STEP: Register */}
        {step === STEP.REGISTER && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Create account</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>Just a few details to get you started</p>
            </div>
            
            {/* Auto-discovered Bank Account UI */}
            <div style={{ background: 'rgba(46,213,115,0.08)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(46,213,115,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏦</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>Bank Account Found!</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Auto-linked to +91 {phone}</div>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" placeholder="Rahul Sharma" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Set 6-digit UPI PIN</label>
              <input className="input" type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/,''))} />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm PIN</label>
              <input className="input" type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/,''))} />
            </div>
            <div className="input-group">
              <label className="input-label">Referral Code (optional)</label>
              <input className="input" placeholder="FP123456" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} />
            </div>
            <button className="btn btn-primary btn-full" onClick={register} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" /> : 'Create Account 🎉'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
