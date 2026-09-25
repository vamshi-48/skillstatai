import React from 'react';

export default function AccessibilityPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--surface, #fff)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
        <h3>Accessibility & Inclusive Learning</h3>
        
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Text Size</label>
          <select style={{ width: '100%', padding: '8px' }}>
            <option>Default</option>
            <option>Large</option>
            <option>Extra Large</option>
          </select>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Contrast</label>
          <select style={{ width: '100%', padding: '8px' }}>
            <option>Default</option>
            <option>High Contrast</option>
          </select>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" /> Read Aloud Support
          </label>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" /> Voice Input (Speech-to-Text)
          </label>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" /> Reduced Motion
          </label>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--primary-color, #007bff)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
