import React, { useEffect, useState, useMemo } from 'react';
import { cajaApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { CajaDiaria } from '../types';
import { formatPeso, formatFechaHora } from '../utils/format';
import Toast from '../components/Toast';

type FiltroFecha = 'todo' | 'hoy' | 'semana' | 'mes' | 'personalizado';

interface Props { onCajaChange: () => void; }

const CajaPage: React.FC<Props> = () => {
  const { cajaActiva, setCajaActiva, recargarCaja } = useApp();
  const [historial, setHistorial] = useState<CajaDiaria[]>([]);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoContado, setMontoContado] = useState('');
  const [obs, setObs] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [toast, setToast] = useState('');

  // Filtros historial
  const [filtro, setFiltro] = useState<FiltroFecha>('todo');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    cajaApi.getAll().then(setHistorial).catch(console.error);
  }, [cajaActiva]);

  const abrirCaja = async () => {
    if (!montoInicial) return;
    setProcesando(true);
    try {
      const caja = await cajaApi.abrir(Number(montoInicial), obs || undefined);
      setCajaActiva(caja);
      setMontoInicial('');
      setObs('');
      recargarCaja();
      const hist = await cajaApi.getAll();
      setHistorial(hist);
    } catch (e: any) {
      setToast(e?.response?.data?.message || 'Error al abrir la caja');
    } finally { setProcesando(false); }
  };

  const cerrarCaja = async () => {
    if (!cajaActiva || !montoContado) return;
    setConfirmCierre(false);
    setProcesando(true);
    try {
      await cajaApi.cerrar(cajaActiva.id, Number(montoContado), obs || undefined);
      setCajaActiva(null);
      setMontoContado('');
      setObs('');
      recargarCaja();
      const hist = await cajaApi.getAll();
      setHistorial(hist);
    } catch (e: any) {
      setToast(e?.response?.data?.message || 'Error al cerrar la caja');
    } finally { setProcesando(false); }
  };

  const diferencia = cajaActiva && montoContado
    ? Number(montoContado) - (Number(cajaActiva.montoInicial) + Number(cajaActiva.totalEfectivo))
    : null;

  // ── Filtrado del historial ────────────────────────────────────────────────
  const historialFiltrado = useMemo(() => {
    const cerradas = historial.filter(c => c.estado === 'CERRADA');
    if (filtro === 'todo') return cerradas;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return cerradas.filter(c => {
      const fecha = new Date(c.fecha);
      fecha.setHours(0, 0, 0, 0);

      if (filtro === 'hoy') {
        return fecha.getTime() === hoy.getTime();
      }
      if (filtro === 'semana') {
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        return fecha >= inicioSemana;
      }
      if (filtro === 'mes') {
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }
      if (filtro === 'personalizado') {
        const desde = fechaDesde ? new Date(fechaDesde) : null;
        const hasta = fechaHasta ? new Date(fechaHasta) : null;
        if (hasta) hasta.setHours(23, 59, 59, 999);
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
      }
      return true;
    });
  }, [historial, filtro, fechaDesde, fechaHasta]);

  const totalFiltrado = historialFiltrado.reduce((sum, c) => sum + Number(c.totalGeneral), 0);

  const btnFiltro = (f: FiltroFecha, label: string) => (
    <button
      key={f}
      onClick={() => setFiltro(f)}
      style={{
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        border: '1.5px solid',
        borderColor: filtro === f ? 'var(--navy)' : 'var(--bd)',
        background: filtro === f ? 'var(--navy)' : 'transparent',
        color: filtro === f ? 'white' : 'var(--text2)',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── MODAL CONFIRMAR CIERRE ── */}
      {confirmCierre && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--s)', borderRadius: 'var(--r)',
            padding: '28px 32px', maxWidth: 360, width: '90%',
            boxShadow: '0 8px 40px rgba(0,0,0,.25)',
            border: '1.5px solid var(--bd)',
            animation: 'slideIn .15s ease',
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🔒</div>
            <div style={{
              fontSize: 16, fontWeight: 800, color: 'var(--navy)',
              textAlign: 'center', marginBottom: 8,
            }}>¿Confirmar cierre de caja?</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 20 }}>
              Esta acción cerrará la caja del día y registrará el monto contado de{' '}
              <strong style={{ color: 'var(--navy)' }}>{formatPeso(Number(montoContado))}</strong>.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCierre(false)}
                style={{
                  flex: 1, height: 40, border: '1.5px solid var(--bd)',
                  borderRadius: 'var(--r-sm)', background: 'var(--bg)',
                  fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer',
                }}
              >Cancelar</button>
              <button
                onClick={cerrarCaja}
                style={{
                  flex: 1, height: 40, border: 'none',
                  borderRadius: 'var(--r-sm)', background: '#c0351a',
                  fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer',
                }}
              >Sí, cerrar caja</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {!cajaActiva ? (
          /* ── ABRIR CAJA ── */
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div style={{
              background: 'var(--s)', borderRadius: 'var(--r)',
              padding: 28, boxShadow: 'var(--sh)', border: '1.5px solid var(--bd)',
              animation: 'slideIn .2s ease',
            }}>
              <div style={{
                fontSize: 32, textAlign: 'center', marginBottom: 6,
                filter: 'grayscale(0.3)',
              }}>💰</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 20,
                fontWeight: 700, color: 'var(--navy)', textAlign: 'center', marginBottom: 4,
              }}>Abrir caja del día</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 22 }}>
                {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                MONTO INICIAL (efectivo en caja)
              </label>
              <input
                className="inp"
                type="number"
                placeholder="Ej: 50000"
                value={montoInicial}
                onChange={e => setMontoInicial(e.target.value)}
                style={{ marginBottom: 10, fontSize: 15, height: 42 }}
              />
              {montoInicial && (
                <div style={{
                  textAlign: 'center', fontSize: 22, fontWeight: 800,
                  color: 'var(--navy)', fontFamily: 'var(--font-display)',
                  marginBottom: 10, background: 'var(--gold-bg)',
                  padding: '8px', borderRadius: 8, border: '1px solid var(--gold-bd)',
                }}>
                  {formatPeso(Number(montoInicial))}
                </div>
              )}
              <input
                className="inp"
                placeholder="Observaciones (opcional)"
                value={obs}
                onChange={e => setObs(e.target.value)}
                style={{ marginBottom: 14 }}
              />
              <button
                className="btn-primary"
                onClick={abrirCaja}
                disabled={!montoInicial || procesando}
                style={{ width: '100%', height: 44, fontSize: 14 }}
              >
                {procesando ? '⏳ Abriendo...' : '⬤ Abrir caja'}
              </button>
            </div>
          </div>
        ) : (
          /* ── CAJA ABIERTA ── */
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{
              background: 'var(--green-bg)', border: '1.5px solid #8ed4b0',
              borderRadius: 'var(--r)', padding: '12px 18px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>⬤</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                  Caja abierta desde {formatFechaHora(cajaActiva.abiertoEn)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  Monto inicial: {formatPeso(cajaActiva.montoInicial)}
                </div>
              </div>
            </div>

            {/* Resumen acumulado */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10, marginBottom: 16,
            }}>
              {[
                { label: 'Efectivo recibido', value: cajaActiva.totalEfectivo, color: 'var(--green)' },
                { label: 'Tarjeta', value: cajaActiva.totalTarjeta, color: 'var(--c-fact)' },
                { label: 'Transferencia', value: cajaActiva.totalTransferencia, color: 'var(--c-fact)' },
                { label: 'Pensionados (cuenta)', value: cajaActiva.totalPensionados, color: 'var(--c-pens)' },
                { label: 'Propinas', value: cajaActiva.totalPropinas ?? 0, color: 'var(--c-part)' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--s)', borderRadius: 'var(--r-sm)',
                  padding: '12px 16px', border: '1.5px solid var(--bd)',
                  boxShadow: 'var(--sh-xs)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: 'var(--font-display)' }}>
                    {formatPeso(item.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Total general */}
            <div style={{
              background: 'var(--navy)', borderRadius: 'var(--r)',
              padding: '14px 20px', marginBottom: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>
                Total del día
              </span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#f0c840', fontFamily: 'var(--font-display)' }}>
                {formatPeso(cajaActiva.totalGeneral)}
              </span>
            </div>

            {/* Cierre */}
            <div style={{
              background: 'var(--s)', borderRadius: 'var(--r)',
              padding: '18px 20px', border: '1.5px solid var(--bd)',
              boxShadow: 'var(--sh-xs)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 12 }}>
                CIERRE DE CAJA
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                MONTO CONTADO (efectivo físico al cerrar)
              </label>
              <input
                className="inp"
                type="number"
                placeholder="Cuenta el efectivo y escribe el total"
                value={montoContado}
                onChange={e => setMontoContado(e.target.value)}
                style={{ marginBottom: 8, height: 40 }}
              />

              {diferencia !== null && (
                <div style={{
                  padding: '8px 12px', borderRadius: 6, marginBottom: 8,
                  background: diferencia >= 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                  border: `1px solid ${diferencia >= 0 ? '#8ed4b0' : '#f4a99a'}`,
                  fontSize: 12, fontWeight: 700,
                  color: diferencia >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {diferencia >= 0
                    ? `✓ Sobrante: ${formatPeso(diferencia)}`
                    : `⚠ Faltante: ${formatPeso(Math.abs(diferencia))}`}
                </div>
              )}

              <input
                className="inp"
                placeholder="Observaciones de cierre"
                value={obs}
                onChange={e => setObs(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <button
                onClick={() => setConfirmCierre(true)}
                disabled={!montoContado || procesando}
                style={{
                  width: '100%', height: 42,
                  background: '#c0351a', color: 'white',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                  opacity: montoContado ? 1 : .4,
                }}
              >
                {procesando ? '⏳ Cerrando...' : '🔒 Cerrar caja'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── HISTORIAL ── */}
      <aside style={{
        width: 310, background: 'var(--s2)', borderLeft: '1.5px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Header historial */}
        <div style={{
          padding: '10px 13px', borderBottom: '1.5px solid var(--bd)',
          background: 'var(--navy)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'white' }}>
            📜 Historial de cajas
          </span>
        </div>

        {/* Filtros de fecha */}
        <div style={{
          padding: '8px 10px', borderBottom: '1.5px solid var(--bd)',
          background: 'var(--s)',
        }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: filtro === 'personalizado' ? 8 : 0 }}>
            {btnFiltro('todo', 'Todo')}
            {btnFiltro('hoy', 'Hoy')}
            {btnFiltro('semana', 'Semana')}
            {btnFiltro('mes', 'Mes')}
            {btnFiltro('personalizado', '📅 Rango')}
          </div>
          {filtro === 'personalizado' && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                style={{
                  flex: 1, fontSize: 11, padding: '4px 6px',
                  border: '1.5px solid var(--bd)', borderRadius: 6,
                  background: 'var(--bg)', color: 'var(--text)',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>–</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                style={{
                  flex: 1, fontSize: 11, padding: '4px 6px',
                  border: '1.5px solid var(--bd)', borderRadius: 6,
                  background: 'var(--bg)', color: 'var(--text)',
                }}
              />
            </div>
          )}
        </div>

        {/* Resumen del filtro */}
        {historialFiltrado.length > 0 && (
          <div style={{
            padding: '6px 12px', borderBottom: '1px solid var(--bd)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--gold-bg)',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700 }}>
              {historialFiltrado.length} caja{historialFiltrado.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
              {formatPeso(totalFiltrado)}
            </span>
          </div>
        )}

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 7 }}>
          {historialFiltrado.map(caja => (
            <div key={caja.id} style={{
              background: 'var(--s)', border: '1.5px solid var(--bd)',
              borderRadius: 'var(--r-sm)', padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>
                  {new Date(caja.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--navy)',
                  fontFamily: 'var(--font-display)',
                }}>{formatPeso(caja.totalGeneral)}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.7 }}>
                Efectivo: {formatPeso(caja.totalEfectivo)} · Tarjeta: {formatPeso(caja.totalTarjeta)}
              </div>
              {caja.diferencia !== null && caja.diferencia !== undefined && (
                <div style={{
                  fontSize: 10, fontWeight: 700, marginTop: 3,
                  color: Number(caja.diferencia) >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {Number(caja.diferencia) >= 0 ? '▲' : '▼'} {formatPeso(Math.abs(Number(caja.diferencia)))}
                </div>
              )}
            </div>
          ))}
          {historialFiltrado.length === 0 && (
            <div className="empty-state">
              <p>{filtro === 'todo' ? 'Sin cajas cerradas' : 'Sin cajas en este período'}</p>
            </div>
          )}
        </div>
      </aside>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default CajaPage;
