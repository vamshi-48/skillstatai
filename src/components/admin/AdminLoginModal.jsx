import React, { useState } from 'react'
import { isAllowedAdmin } from '../../config/adminConfig'

export default function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToUserLogin,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAuthenticate = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    const targetEmail = (email || '').trim().toLowerCase()

    if (!targetEmail) {
      setError('Please enter your administrator email address in the mailbox.')
      return
    }

    if (!password.trim()) {
      setError('Please enter your administrator security key or password.')
      return
    }

    if (!isAllowedAdmin(targetEmail)) {
      setError(
        `⛔ Access Denied: "${targetEmail}" is not recognized as an authorized administrator email.`
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
        style={{ maxWidth: '480px', width: '92%' }}
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
        <form onSubmit={handleAuthenticate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
          <label className="auth-form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div className="field-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Administrator Email Address</span>
              <span className="field-hint" style={{ fontSize: '11px', color: '#64748b' }}>Admin Mail Box</span>
            </div>
            <div className="input-with-icon" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <span
                className="input-icon"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  pointerEvents: 'none',
                  fontSize: '16px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ✉️
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="Enter your administrator email address"
                required
                autoFocus
                autoComplete="email"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px 12px 46px',
                  fontSize: '14px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  lineHeight: '1.4',
                }}
              />
            </div>
          </label>

          <label className="auth-form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div className="field-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Administrator Security Key / Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? 'Hide 🔒' : 'Show 👁️'}
              </button>
            </div>
            <div className="input-with-icon" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <span
                className="input-icon"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  pointerEvents: 'none',
                  fontSize: '16px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🔑
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter your security key or password"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px 12px 46px',
                  fontSize: '14px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  lineHeight: '1.4',
                }}
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
        <div className="admin-footer-switch" style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
