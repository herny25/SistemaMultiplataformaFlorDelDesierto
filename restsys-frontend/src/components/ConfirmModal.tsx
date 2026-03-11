import React from 'react';

interface Props {
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmColor = '#c0351a',
  onConfirm,
  onCancel,
}) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}
    onClick={onCancel}
  >
    <div
      style={{
        background: 'var(--s)', borderRadius: 'var(--r)',
        padding: '28px 32px', maxWidth: 380, width: '90%',
        boxShadow: '0 8px 40px rgba(0,0,0,.25)',
        border: '1.5px solid var(--bd)',
        animation: 'slideIn .15s ease',
      }}
      onClick={e => e.stopPropagation()}
    >
      {title && (
        <div style={{
          fontSize: 16, fontWeight: 800, color: 'var(--navy)',
          textAlign: 'center', marginBottom: 10,
        }}>{title}</div>
      )}
      <div style={{
        fontSize: 13, color: 'var(--text2)', textAlign: 'center',
        marginBottom: 22, lineHeight: 1.6,
      }}>{message}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, height: 40, border: '1.5px solid var(--bd)',
            borderRadius: 'var(--r-sm)', background: 'var(--bg)',
            fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer',
          }}
        >Cancelar</button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, height: 40, border: 'none',
            borderRadius: 'var(--r-sm)', background: confirmColor,
            fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer',
          }}
        >{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
