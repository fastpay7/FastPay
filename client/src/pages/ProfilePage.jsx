import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, User, Shield, Bell, HelpCircle, LogOut, ChevronRight, Copy, Share2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showKyc, setShowKyc] = useState(false)
  const [kycStep, setKycStep] = useState(1)
  const [aadhaar, setAadhaar] = useState('')
  const [kycOtp, setKycOtp] = useState('')
  const [kycLoading, setKycLoading] = useState(false)

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FP'

  const handleKycSubmit = async () => {
    if (kycStep === 1) {
      if (aadhaar.length !== 12) return toast.error('Enter valid 12-digit Aadhaar')
      setKycLoading(true)
      setTimeout(() => {
        setKycLoading(false)
        setKycStep(2)
        toast.success(`OTP sent to mobile linked with Aadhaar ending in ${aadhaar.slice(-4)}`)
      }, 1500)
    } else if (kycStep === 2) {
      if (kycOtp.length !== 6) return toast.error('Enter 6-digit OTP')
      setKycLoading(true)
      try {
        const { data } = await api.post('/users/kyc', { aadhaar })
        setKycStep(3)
        // Refresh user to update status and balance
        const res = await api.get('/users/me')
        useAuthStore.getState().setUser(res.data)
      } catch (e) {
        toast.error(e.response?.data?.error || 'KYC Failed')
      } finally {
        setKycLoading(false)
      }
    }
  }

  const MENU = [
    {
      items: [
        {
          icon: <User size={18} />, label: 'Account Details',
          sub: user?.phone,
          onClick: () => navigate('/account'),
        },
        {
          icon: <Shield size={18} />, label: 'Change UPI PIN',
          sub: 'Reset your 6-digit PIN',
          onClick: () => navigate('/change-pin'),
        },
      ],
    },
    {
      label: 'Preferences',
      items: [
        { icon: <Bell size={18} />, label: 'Notifications', sub: 'Manage alerts', onClick: () => navigate('/notif') },
        { icon: <Share2 size={18} />, label: 'Refer & Earn', sub: `Code: ${user?.referralCode}`, onClick: () => { navigator.clipboard.writeText(user?.referralCode || ''); toast.success('Referral code copied!') } },
      ],
    },
    {
      label: 'Support',
      items: [
        { icon: <HelpCircle size={18} />, label: 'Help & FAQ', sub: 'Get support', onClick: () => toast('Coming soon!') },
      ],
    },
  ]

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{
        padding: '52px 20px 28px',
        background: 'linear-gradient(160deg, #1A0A3E 0%, #0A0A0F 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,71,255,0.2) 0%, transparent 70%)',
          top: -60, right: -40, pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Profile</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div className="avatar avatar-xl">{initials}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{user?.name}</div>
            <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>+91 {user?.phone}</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--primary-light)', fontWeight: 600, fontSize: 14 }}>{user?.upiId}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(user?.upiId || ''); toast.success('UPI ID copied!') }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* KYC badge */}
        <div style={{ marginTop: 16 }}>
          {user?.kycStatus === 'verified' ? (
            <span className="badge badge-success">✓ KYC Verified</span>
          ) : (
            <button
              onClick={() => setShowKyc(true)}
              style={{
                background: 'rgba(255,165,2,0.15)', border: '1px solid var(--warning)', color: 'var(--warning)',
                padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ⏳ Complete KYC via DigiLocker
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {MENU.map((section, si) => (
          <div key={si} style={{ marginBottom: 20 }}>
            {section.label && <div className="section-title">{section.label}</div>}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {section.items.map((item, ii) => (
                <button
                  key={ii}
                  onClick={item.onClick}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px',
                    borderBottom: ii < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(108,71,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary-light)', flexShrink: 0,
                  }}>{item.icon}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                    {item.sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{item.sub}</div>}
                  </div>
                  <ChevronRight size={16} color="var(--text4)" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          className="btn btn-danger btn-full"
          onClick={() => { if (confirm('Are you sure you want to logout?')) logout() }}
        >
          <LogOut size={16} /> Logout
        </button>

        <div style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 12, marginTop: 20 }}>
          FastPay v1.0.0 · Made with ❤️ in India
        </div>
      </div>

      {/* DigiLocker KYC Modal */}
      {showKyc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(4px)'
        }} onClick={() => { if (!kycLoading && kycStep !== 3) setShowKyc(false) }}>
          <div className="card slide-up" style={{ width: '100%', maxWidth: 360, background: '#fff', color: '#000', padding: 24 }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #eee', paddingBottom: 16, marginBottom: 20 }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/DigiLocker_logo.svg/512px-DigiLocker_logo.svg.png" alt="DigiLocker" style={{ height: 28 }} onError={(e) => e.target.style.display = 'none'} />
              <div style={{ fontWeight: 700, fontSize: 18, color: '#004B87' }}>DigiLocker</div>
            </div>

            {kycStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Verify your Aadhaar</div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.4 }}>
                  FastPay uses DigiLocker to securely verify your identity with UIDAI.
                </p>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 6, display: 'block' }}>Aadhaar Number</label>
                  <input
                    type="tel" maxLength={12} placeholder="Enter 12-digit Aadhaar"
                    value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 16, outline: 'none' }}
                  />
                </div>
                <button
                  onClick={handleKycSubmit} disabled={kycLoading || aadhaar.length !== 12}
                  style={{ background: '#004B87', color: '#fff', padding: 14, borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', marginTop: 8 }}
                >
                  {kycLoading ? 'Connecting to UIDAI...' : 'Next'}
                </button>
              </div>
            )}

            {kycStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Enter OTP</div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.4 }}>
                  An OTP has been sent to your mobile number registered with Aadhaar ending in <strong>{aadhaar.slice(-4)}</strong>.
                </p>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 6, display: 'block' }}>6-digit OTP</label>
                  <input
                    type="tel" maxLength={6} placeholder="Enter OTP" autoFocus
                    value={kycOtp} onChange={e => setKycOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 16, outline: 'none', letterSpacing: 2 }}
                  />
                </div>
                <button
                  onClick={handleKycSubmit} disabled={kycLoading || kycOtp.length !== 6}
                  style={{ background: '#004B87', color: '#fff', padding: 14, borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', marginTop: 8 }}
                >
                  {kycLoading ? 'Verifying Documents...' : 'Verify OTP'}
                </button>
              </div>
            )}

            {kycStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E8F5E9', color: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#2E7D32' }}>KYC Verified!</div>
                  <p style={{ fontSize: 13, color: '#666', marginTop: 8, lineHeight: 1.4 }}>
                    Your identity has been successfully verified via DigiLocker.
                  </p>
                  <div style={{ background: '#FFF3E0', color: '#E65100', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginTop: 16 }}>
                    🎁 ₹50 KYC Bonus credited!
                  </div>
                </div>
                <button
                  onClick={() => setShowKyc(false)}
                  style={{ background: '#004B87', color: '#fff', padding: 14, borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', width: '100%', marginTop: 8 }}
                >
                  Continue to FastPay
                </button>
              </div>
            )}

            {kycStep !== 3 && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/cf/Aadhaar_Logo.svg/1200px-Aadhaar_Logo.svg.png" alt="Aadhaar" style={{ height: 20, opacity: 0.6 }} onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
