import React, { useState } from 'react'
import { isAllowedAdmin, ADMIN_DIRECTORY, getAdminDetails } from '../../config/adminConfig'

export default function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToUserLogin,
}) {
  const [selectedAdmin, setSelectedAdmin] = useState(ADMIN_DIRECTORY[0])
  const [customEmail, setCustomEmail] = useState('')
  const [useCustomEmail, setUseCustomEmail] = useState(false)
  const [password, setPassword] = useState('Admin@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAuthenticate = (emailToAuth) => {
    setError('')
    const targetEmail = (emailToAuth || (useCustomEmail ? customEmail : selectedAdmin?.email) || '').trim().toLowerCase()

    if (!targetEmail) {
      setError('Please select an administrator or enter an authorized official email.')
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
            Directly select an authorized administrator below to launch the central governance,
            institutional evaluation records &amp; competency framework portal.
          </p>
          <div className="admin-encryption-tag">
            <span className="lock-icon">🔒</span>
            <span>256-Bit TLS Encrypted • Official Administrator Access</span>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Authorized Administrators Roster (Select Administrator)
          </span>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            onClick={() => setUseCustomEmail(!useCustomEmail)}
          >
            {useCustomEmail ? '← Choose from Administrator List' : 'Enter Custom Official ID →'}
          </button>
        </div>

        {!useCustomEmail ? (
          <div className="admin-roster-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
            {ADMIN_DIRECTORY.map((adm) => {
              const isSelected = selectedAdmin?.email.toLowerCase() === adm.email.toLowerCase()
              return (
                <div
                  key={adm.email}
                  className={`admin-roster-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAdmin(adm)
                    setError('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 2px 10px rgba(37,99,235,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isSelected ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#1e3a8a',
                        fontWeight: 800,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: isSelected ? 'none' : '1px solid #cbd5e1',
                      }}
                    >
                      {adm.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{adm.name}</strong>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1d4ed8' : '#475569' }}>
                          {adm.badge || 'Admin'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                        {adm.role} • <span style={{ color: '#64748b' }}>{adm.department}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAdmin(adm)
                      handleAuthenticate(adm.email)
                    }}
                    style={{
                      padding: '6px 14px',
                      background: isSelected ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    }}
                  >
                    Direct Login ➔
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <label className="auth-form-field">
              <div className="field-label-row">
                <span>Official Administrator Email or Employee ID</span>
                <span className="field-hint">Registered MoSPI Official</span>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  type="text"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="admin@mospi.gov.in or EMP-MoSPI-2026-08"
                  required
                />
              </div>
            </label>
          </div>
        )}

        {/* Selected Administrator Preview & Action */}
        {!useCustomEmail && selectedAdmin && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12.5px', color: '#334155' }}>
              Signing in as: <strong style={{ color: '#0f172a' }}>{selectedAdmin.name}</strong> <span style={{ color: '#64748b' }}>({selectedAdmin.role})</span>
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>✔ Clearance Verified</span>
          </div>
        )}

        {error && (
          <div className="admin-error-banner" role="alert" style={{ marginBottom: '12px' }}>
            <span className="error-icon">⛔</span>
            <span>{error}</span>
          </div>
        )}

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-submit-btn"
            disabled={isSubmitting}
            onClick={() => handleAuthenticate(useCustomEmail ? customEmail : selectedAdmin?.email)}
          >
            <span>
              {isSubmitting
                ? 'Authenticating...'
                : useCustomEmail
                ? 'Authenticate & Open Admin Portal ➔'
                : `Login as ${selectedAdmin?.name || 'Administrator'} & Open Admin Portal ➔`}
            </span>
          </button>
        </div>

        {/* Footer switch */}
        <div className="admin-footer-switch" style={{ marginTop: '16px' }}>
          <span>Looking for Officer / Learner Assessment?</span>
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
