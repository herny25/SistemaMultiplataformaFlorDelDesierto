import React, { useEffect } from 'react';

interface Props {
  message: string;
  type?: 'error' | 'info' | 'success';
  onClose: () => void;
}

const Toast: React.FC<Props> = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const s = {
    error:   { bg: '#fde8e5', color: '#c0392b', border: '#f4a99a', icon: '⚠' },
    info:    { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9', icon: 'ℹ' },
    success: { bg: '#d4f0e2', color: '#16784a', border: '#8ed4b0', icon: '✓' },
  }[type];

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999,
      background: s.bg, color: s.color,
      border: `1.5px solid ${s.border}`,
      borderRadius: 10, padding: '11px 18px', fontSize: 13, fontWeight: 700,
      boxShadow: '0 4px 20px rgba(0,0,0,.18)',
      display: 'flex', alignItems: 'center', gap: 10,
      maxWidth: 500, minWidth: 240, animation: 'slideIn .15s ease',
      whiteSpace: 'pre-wrap',
    }}>
      <span style={{ fontSize: 15 }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 14, color: s.color, opacity: .7, lineHeight: 1,
        padding: '0 2px', marginLeft: 4, flexShrink: 0,
      }}>✕</button>
    </div>
  );
};

export default Toast;
