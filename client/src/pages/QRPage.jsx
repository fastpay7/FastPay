import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Camera, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function QRPage() {
  const [tab, setTab] = useState('my') // my | scan
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const qrValue = JSON.stringify({ upiId: user?.upiId, name: user?.name })

  const downloadQR = () => {
    const svg = document.getElementById('my-qr')
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fastpay-${user?.upiId}.svg`; a.click()
    URL.revokeObjectURL(url)
    toast.success('QR downloaded!')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '52px 20px 20px' }}>
        <button className="btn btn-icon" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>QR Code</h1>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="tabs">
          <button className={`tab-btn${tab === 'my' ? ' active' : ''}`} onClick={() => setTab('my')}>My QR</button>
          <button className={`tab-btn${tab === 'scan' ? ' active' : ''}`} onClick={() => setTab('scan')}>Scan & Pay</button>
        </div>
      </div>

      <div style={{ padding: '0 20px', flex: 1 }}>
        {tab === 'my' && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            {/* QR Card */}
            <div style={{
              background: '#fff',
              borderRadius: 24,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              maxWidth: 320,
              boxShadow: '0 8px 40px rgba(108,71,255,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg,#6C47FF,#00D4AA)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 900 }}>⚡</span>
                </div>
                <span style={{ color: '#1a1a2e', fontWeight: 800, fontSize: 18 }}>FastPay</span>
              </div>

              <QRCodeSVG
                id="my-qr"
                value={qrValue}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="M"
                includeMargin={false}
              />

              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#6C47FF', fontWeight: 700, fontSize: 16 }}>{user?.upiId}</div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{user?.name}</div>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={downloadQR} style={{ gap: 8 }}>
              <Download size={16} /> Download QR
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, maxWidth: 260 }}>
              Show this QR code to anyone to receive payments instantly
            </div>
          </div>
        )}

        {tab === 'scan' && <ScanTab navigate={navigate} />}
      </div>
    </div>
  )
}

function ScanTab({ navigate }) {
  const [manual, setManual] = useState('')
  const [amount, setAmount] = useState('')

  const payManual = () => {
    if (!manual.includes('@')) return toast.error('Enter a valid UPI ID')
    navigate(`/send?upiId=${encodeURIComponent(manual)}&amount=${amount}`)
  }

  return (
    <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Camera placeholder */}
      <div style={{
        background: 'var(--bg3)',
        border: '2px dashed var(--border2)',
        borderRadius: 20,
        height: 260,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text3)',
      }}>
        <Camera size={48} strokeWidth={1.5} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Camera Scanner</div>
          <div style={{ fontSize: 13 }}>Use your device camera to scan UPI QR</div>
        </div>
        <div style={{
          background: 'rgba(108,71,255,0.1)',
          border: '1px solid rgba(108,71,255,0.3)',
          borderRadius: 20, padding: '6px 14px', fontSize: 12, color: 'var(--primary-light)',
        }}>
          Available on mobile browsers
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--text3)', fontSize: 13 }}>or enter manually</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div className="input-group">
        <label className="input-label">UPI ID</label>
        <input className="input" placeholder="name@fastpay" value={manual} onChange={e => setManual(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Amount (₹)</label>
        <div className="input-prefix">
          <span className="prefix">₹</span>
          <input className="input" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={payManual}>Continue to Pay</button>
    </div>
  )
}
