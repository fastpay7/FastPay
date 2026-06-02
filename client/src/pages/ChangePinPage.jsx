import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, KeyRound, Smartphone, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function ChangePinPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1) // 1: phone, 2: otp, 3: new pin
  const [phone, setPhone] = useState(user?.phone || '')
  const [otp, setOtp] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit number')
    if (phone !== user?.phone) return toast.error('You can only reset the PIN for your own number')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/send-otp', { phone })
      if (data.devOtp) toast(`Dev OTP: ${data.devOtp}`, { duration: 5000, icon: '🛠️' })
      toast.success('OTP sent!')
      setStep(2)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP')
    setStep(3)
  }

  const handleResetPin = async () => {
    if (newPin.length !== 6) return toast.error('PIN must be 6 digits')
    if (newPin !== confirmPin) return toast.error('PINs do not match')
    setLoading(true)
    try {
      await api.post('/auth/reset-pin', { phone, otp, newPin })
      toast.success('UPI PIN changed successfully!')
      navigate(-1)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to change PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 24px', background: 'var(--bg2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Reset UPI PIN</h1>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(108,71,255,0.1)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Smartphone size={32} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Verify Phone Number</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>Enter your registered mobile number to receive an OTP.</p>
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ background: 'var(--bg2)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', color: 'var(--text3)' }}>
                    +91
                  </div>
                  <input
                    className="input"
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <button className="btn btn-primary" style={{ padding: 16 }} onClick={handleSendOtp} disabled={loading || phone.length !== 10}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(108,71,255,0.1)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ShieldCheck size={32} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Enter OTP</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>An OTP was sent to +91 {phone}</p>
              </div>

              <div className="input-group">
                <label className="input-label">6-digit OTP</label>
                <input
                  className="input"
                  type="tel"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ letterSpacing: 4, textAlign: 'center', fontSize: 24 }}
                  autoFocus
                />
              </div>

              <button className="btn btn-primary" style={{ padding: 16 }} onClick={handleVerifyOtp} disabled={otp.length !== 6}>
                Verify OTP
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(108,71,255,0.1)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <KeyRound size={32} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Set New PIN</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>Create a new 6-digit secure PIN.</p>
              </div>

              <div className="input-group">
                <label className="input-label">New PIN</label>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ letterSpacing: 4, textAlign: 'center', fontSize: 24 }}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Confirm New PIN</label>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ letterSpacing: 4, textAlign: 'center', fontSize: 24 }}
                />
              </div>

              <button className="btn btn-primary" style={{ padding: 16 }} onClick={handleResetPin} disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}>
                {loading ? 'Updating...' : 'Update PIN'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
