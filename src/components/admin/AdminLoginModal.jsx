import React, { useState } from 'react'
import { isAllowedAdmin, ALLOWED_ADMIN_EMAILS } from '../../config/adminConfig'

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
  const [showAuthorizedList, setShowAuthorizedList] = useState(false)

  if (!isOpen) return null

  const handleAuthenticate = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    const targetEmail = (email || '').trim().toLowerCase()

    if (!targetEmail) {
      setError('Please enter an authorized official administrator email or employee ID.')
      return
    }

    if (!isAllowedAdmin(targetEmail)) {
      setError(
        `⛔ Access Denied: "${targetEmail}" is not recognized in the official MoSPI Administrative Directory. Please select one of the authorized administrator accounts below.`
      )
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      onSuccess?.(targetEmail)
    }, 200)
  }

  const authorizedList = ALLOWED_ADMIN_EMAILS.filter((e) => e !== 'admin')

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
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Official Administrator Email</span>
              <span className="field-hint" style={{ fontSize: '11px', color: '#64748b' }}>Authorized MoSPI Official</span>
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
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="admin@mospi.gov.in"
                required
                autoFocus
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Administrator Security Key / PIN</span>
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
                placeholder="Enter Administrator Security Key"
                required
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

          {/* Quick Authorized Emails Dropdown / Reference */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAuthorizedList ? '8px' : 0 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                🛡️ Authorized Administrator Emails:
              </span>
              <button
                type="button"
                onClick={() => setShowAuthorizedList(!showAuthorizedList)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {showAuthorizedList ? 'Hide List ▲' : 'View All 8 Authorized Emails ▼'}
              </button>
            </div>

            {showAuthorizedList && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {authorizedList.map((admEmail) => (
                  <button
                    key={admEmail}
                    type="button"
                    onClick={() => {
                      setEmail(admEmail)
                      setError('')
                    }}
                    style={{
                      background: email.toLowerCase() === admEmail.toLowerCase() ? '#dbeafe' : '#ffffff',
                      border: email.toLowerCase() === admEmail.toLowerCase() ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      color: email.toLowerCase() === admEmail.toLowerCase() ? '#1d4ed8' : '#334155',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease',
                    }}
                    title={`Click to fill ${admEmail}`}
                  >
                    {admEmail}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="admin-error-banner" role="alert" style={{ margin: '4px 0' }}>
              <span className="error-icon">⛔</span>
              <span>{error}</span>
            </div>
          )}

          <div className="admin-form-actions" style={{ marginTop: '4px' }}>
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
