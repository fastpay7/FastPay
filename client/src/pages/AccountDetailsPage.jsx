import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, User, Phone, AtSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function AccountDetailsPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', { name })
      setUser({ ...user, ...data })
      toast.success('Profile updated successfully!')
      navigate(-1)
    } catch (e) {
      toast.error('Failed to update profile')
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
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Account Details</h1>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> Full Name
            </label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> Phone Number (Verified)
            </label>
            <input
              className="input"
              type="text"
              value={'+91 ' + user?.phone}
              disabled
              style={{ opacity: 0.7, background: 'var(--bg2)' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AtSign size={14} /> UPI ID
            </label>
            <input
              className="input"
              type="text"
              value={user?.upiId}
              disabled
              style={{ opacity: 0.7, background: 'var(--bg2)' }}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 12, padding: '16px', fontSize: 16 }}
            onClick={handleSave}
            disabled={loading || name === user?.name}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
