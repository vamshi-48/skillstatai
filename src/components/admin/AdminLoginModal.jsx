import React, { useState } from 'react'
import { isAllowedAdmin } from '../../config/adminConfig'

export default function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToUserLogin,
}) {
  const [email, setEmail] = useState('admin@mospi.gov.in')
  const [password, setPassword] = useState('Admin@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAuthenticate = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    const targetEmail = (email || '').trim().toLowerCase()

    if (!targetEmail) {
      setError('Please enter your authorized official administrator email or employee ID.')
      return
    }

    if (!isAllowedAdmin(targetEmail)) {
      setError(
        `⛔ Access Denied: "${targetEmail}" is not recognized in the official MoSPI Administrative Directory. Access is strictly restricted to authorized Directors, Panel Chairs, and Central Administrators.`
      )
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      onSuccess?.(targetEmail)
    }, 200)
  }

  return (
    <div
      className="auth-modal-backdrop admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="auth-modal-dialog admin-login-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px' }}
      >
        <button
          type="button"
          className="auth-modal-close admin-close-btn"
          onClick={onClose}
          aria-label="Close Admin Login"
        >
          ✕
        </button>

        {/* National Emblem & Department Tag */}
        <div className="admin-login-top-badge">
          <span className="admin-badge-emblem">🏛️</span>
          <span>Government of India • Ministry of Statistics &amp; PI</span>
        </div>

        <div className="admin-login-header-group">
          <div className="admin-shield-icon-wrap">
            <span className="admin-shield-icon">🛡️</span>
          </div>
          <h2 className="admin-login-title">Administrative Command Portal Login</h2>
          <p className="admin-login-subtitle">
            Enter your official credentials to access the central governance,
            institutional evaluation records &amp; competency framework portal.
          </p>
          <div className="admin-encryption-tag">
            <span className="lock-icon">🔒</span>
            <span>256-Bit TLS Encrypted • Official Administrator Access</span>
          </div>
        </div>

        {/* Official Credentials Form */}
        <form onSubmit={handleAuthenticate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          <label className="auth-form-field">
            <div className="field-label-row">
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>Official Administrator Email or Employee ID</span>
              <span className="field-hint" style={{ fontSize: '11px', color: '#64748b' }}>Registered MoSPI Official</span>
            </div>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="admin@mospi.gov.in"
                required
                autoFocus
              />
            </div>
          </label>

          <label className="auth-form-field">
            <div className="field-label-row">
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>Administrator Security Key / PIN</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? 'Hide 🔒' : 'Show 👁️'}
              </button>
            </div>
            <div className="input-with-icon">
              <span className="input-icon">🔑</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter Administrator Security Key"
                required
              />
            </div>
          </label>

          {error && (
            <div className="admin-error-banner" role="alert" style={{ margin: '4px 0' }}>
              <span className="error-icon">⛔</span>
              <span>{error}</span>
            </div>
          )}

          <div className="admin-form-actions" style={{ marginTop: '6px' }}>
            <button
              type="submit"
              className="admin-submit-btn"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting ? 'Authenticating Clearance...' : 'Authenticate & Enter Admin Portal ➔'}
              </span>
            </button>
          </div>
        </form>

        {/* Footer switch */}
        <div className="admin-footer-switch" style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Looking for Officer / Learner Assessment?</span>
          <button
            type="button"
            className="switch-to-user-btn"
            onClick={() => {
              setError('')
              onSwitchToUserLogin?.()
            }}
          >
            ← Return to Officer Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
