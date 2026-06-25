import React from 'react';

export default function VibeShopPanel({ open, onClose, isMobile }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1C1C30', padding: '2rem', borderRadius: '1rem', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Upper Vibe Shop</h2>
        <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)' }}>Coming Soon!</p>
        <button onClick={onClose} style={{ marginTop: '2rem', background: '#00E5FF', color: 'black', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold' }}>Close</button>
      </div>
    </div>
  );
}