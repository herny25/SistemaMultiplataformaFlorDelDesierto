import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import PosPage from './pages/PosPage';
import VentasPage from './pages/VentasPage';
import ReportesPage from './pages/ReportesPage';
import PensionadosPage from './pages/PensionadosPage';
import CajaPage from './pages/CajaPage';
import InventarioPage from './pages/InventarioPage';

type Tab = 'pos' | 'ventas' | 'inventario' | 'reportes' | 'pensionados' | 'caja';

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pos');
  const { cajaActiva, notificaciones, hora } = useApp();

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'pos',         label: 'POS',         icon: '⚡' },
    { id: 'ventas',      label: 'Ventas',       icon: '📋' },
    { id: 'inventario',  label: 'Inventario',   icon: '🍳' },
    { id: 'reportes',    label: 'Reportes',     icon: '📊' },
    { id: 'pensionados', label: 'Pensionados',  icon: '🏢' },
    { id: 'caja',        label: 'Caja',         icon: '💰' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── TOPBAR ── */}
      <header style={{
        height: 54, background: 'var(--navy)', display: 'flex',
        alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0,
        boxShadow: '0 2px 16px rgba(0,0,0,.22)', zIndex: 60,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: '#f0c840', fontWeight: 700,
          }}>RestSys</span>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#22c97a',
            boxShadow: '0 0 8px rgba(34,201,122,.5)',
            animation: 'blink 2s infinite',
            display: 'inline-block',
          }} />
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,.1)' }} />

        {/* Navegación */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 6,
                background: tab === item.id ? 'rgba(184,130,10,.22)' : 'transparent',
                color: tab === item.id ? '#f0c840' : 'rgba(255,255,255,.4)',
                fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .15s', border: 'none', cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (tab !== item.id) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.75)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.07)';
                }
              }}
              onMouseLeave={e => {
                if (tab !== item.id) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.4)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.id === 'pos' && notificaciones > 0 && (
                <span style={{
                  background: 'var(--red)', color: 'white',
                  fontSize: 9.5, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 4,
                }}>{notificaciones}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Estado caja + hora */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {cajaActiva ? (
            <span style={{
              background: 'var(--green-bg)', color: 'var(--green)',
              fontSize: 11.5, fontWeight: 700,
              padding: '5px 11px', borderRadius: 5,
              border: '1px solid #8ed4b0',
            }}>⬤ Caja abierta</span>
          ) : (
            <span style={{
              background: 'var(--red-bg)', color: 'var(--red)',
              fontSize: 11.5, fontWeight: 700,
              padding: '5px 11px', borderRadius: 5,
              border: '1px solid #f4a99a',
              cursor: 'pointer',
            }} onClick={() => setTab('caja')}>⬤ Caja cerrada</span>
          )}
          <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, fontWeight: 600 }}>{hora}</span>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'pos'         && <PosPage />}
        {tab === 'ventas'      && <VentasPage />}
        {tab === 'inventario'  && <InventarioPage />}
        {tab === 'reportes'    && <ReportesPage />}
        {tab === 'pensionados' && <PensionadosPage />}
        {tab === 'caja'        && <CajaPage onCajaChange={() => {}} />}
      </main>
    </div>
  );
};

export default App;
