import React, { useEffect, useState, useCallback } from 'react';
import { ventasApi } from '../services/api';
import type { Venta, TipoCliente, EstadoVenta } from '../types';
import { formatPeso, formatFechaHora, TIPO_CLIENTE_LABEL, METODO_PAGO_LABEL } from '../utils/format';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const ESTADOS_FINALES: EstadoVenta[] = ['ANULADA', 'REEMBOLSADA', 'DEVUELTA'];

const ESTADO_BADGE: Record<EstadoVenta, { cls: string; label: string }> = {
  PROCESADA:   { cls: 'badge-ok',     label: 'Procesada'   },
  PENDIENTE:   { cls: 'badge-orange', label: 'Pendiente'   },
  ANULADA:     { cls: 'badge-red',    label: 'Anulada'     },
  REEMBOLSADA: { cls: 'badge-orange', label: 'Reembolsada' },
  DEVUELTA:    { cls: 'badge-orange', label: 'Devuelta'    },
};

const OPCIONES_ESTADO: { estado: EstadoVenta; label: string; color: string; bg: string; border: string }[] = [
  { estado: 'ANULADA',     label: '🚫 Anular',     color: 'var(--red)',    bg: 'var(--red-bg)',    border: '#f4a99a' },
  { estado: 'REEMBOLSADA', label: '💰 Reembolsar', color: '#b85c00',       bg: '#fff3e0',          border: '#ffb74d' },
  { estado: 'DEVUELTA',    label: '↩ Devolver',    color: '#1565c0',       bg: '#e3f2fd',          border: '#90caf9' },
];

const TIPO_BADGE: Record<string, string> = {
  PENSIONADO: 'badge badge-pens',
  PARTICULAR: 'badge badge-part',
  PARTICULAR_FACTURA: 'badge badge-fact',
  PERSONAL: 'badge badge-pers',
};

const CHIPS: { key: TipoCliente | ''; label: string; color: string; bg: string; border: string }[] = [
  { key: '',                  label: 'Todos',       color: 'var(--text2)',   bg: 'var(--s2)',         border: 'var(--bd)' },
  { key: 'PENSIONADO',        label: 'Pensionados', color: 'var(--c-pens)', bg: 'var(--c-pens-bg)', border: '#b8a4d8' },
  { key: 'PARTICULAR',        label: 'Particular',  color: 'var(--c-part)', bg: 'var(--c-part-bg)', border: '#8ed4b0' },
  { key: 'PARTICULAR_FACTURA',label: 'Factura',     color: 'var(--c-fact)', bg: 'var(--c-fact-bg)', border: '#8ab8e8' },
  { key: 'PERSONAL',          label: 'Personal',    color: 'var(--c-pers)', bg: 'var(--c-pers-bg)', border: '#e0b87a' },
];

const VentasPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fechas, setFechas] = useState({
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
  });
  const [filtroTipo, setFiltroTipo] = useState<TipoCliente | ''>('');
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [menuEstado, setMenuEstado] = useState<{ id: number; top: number; right: number } | null>(null);
  const [toast, setToast] = useState('');
  const [confirmEstado, setConfirmEstado] = useState<{ id: number; estado: EstadoVenta; label: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (fechas.desde) params.desde = fechas.desde;
      if (fechas.hasta) params.hasta = fechas.hasta;
      const data = await ventasApi.getAll(params);
      setVentas(data);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  }, [fechas]);

  useEffect(() => { cargar(); }, [cargar]);

  // Cerrar dropdown de estado al hacer click fuera
  useEffect(() => {
    if (!menuEstado) return;
    const handler = () => setMenuEstado(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuEstado]);

  const cambiarEstado = (id: number, estado: EstadoVenta) => {
    setMenuEstado(null);
    const label = OPCIONES_ESTADO.find(o => o.estado === estado)?.label ?? estado;
    setConfirmEstado({ id, estado, label });
  };

  const confirmarCambioEstado = async () => {
    if (!confirmEstado) return;
    const { id, estado } = confirmEstado;
    setConfirmEstado(null);
    try {
      await ventasApi.cambiarEstado(id, estado);
      cargar();
    } catch (e: any) {
      setToast(e?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const ventasActivas = ventas.filter(v => !ESTADOS_FINALES.includes(v.estado));
  const ventasFiltradas = filtroTipo ? ventas.filter(v => v.tipoCliente === filtroTipo) : ventas;

  // Resumen por tipo (siempre sobre todas las activas del período)
  const sumPens   = ventasActivas.filter(v => v.tipoCliente === 'PENSIONADO');
  const sumPart   = ventasActivas.filter(v => v.tipoCliente === 'PARTICULAR');
  const sumFact   = ventasActivas.filter(v => v.tipoCliente === 'PARTICULAR_FACTURA');
  const sumPers   = ventasActivas.filter(v => v.tipoCliente === 'PERSONAL');
  const totalPart = sumPart.reduce((a, v) => a + Number(v.total), 0);
  const totalFact = sumFact.reduce((a, v) => a + Number(v.total), 0);
  const totalCobrado = totalPart + totalFact;

  const exportarPDF = () => {
    const filtroLabel = CHIPS.find(c => c.key === filtroTipo)?.label ?? 'Todos';
    const periodo = fechas.desde === fechas.hasta
      ? fechas.desde
      : `${fechas.desde} → ${fechas.hasta}`;

    const filas = ventasFiltradas.map(v => `
      <tr style="opacity:${v.estado === 'ANULADA' ? '.45' : '1'}">
        <td>#${v.id}</td>
        <td>${formatFechaHora(v.creadaEn)}</td>
        <td>${TIPO_CLIENTE_LABEL[v.tipoCliente]}</td>
        <td>${v.nombreCliente || v.empleado?.nombre || '—'}${v.empleado?.empresa?.nombre ? `<br><small style="color:#9a7bc4">${v.empleado.empresa.nombre}</small>` : ''}</td>
        <td>${v.mesa || '—'}</td>
        <td>${v.metodoPago ? METODO_PAGO_LABEL[v.metodoPago] : '—'}</td>
        <td class="r b">${v.tipoCliente === 'PERSONAL' ? '<span style="color:#9e5a00;font-size:9px">Sin cobro</span>' : formatPeso(v.total)}</td>
        <td><span class="badge-${v.estado.toLowerCase()}">${v.estado}</span></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Ventas — ${filtroLabel} — ${periodo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10.5px; color: #1a1a2e; padding: 22px 28px; }
  h1 { font-size: 16px; color: #1a1a2e; }
  .sub { color: #888; font-size: 11px; margin: 3px 0 16px; }
  .kpis { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .kpi { border: 1px solid #ddd; border-radius: 7px; padding: 9px 13px; flex: 1; min-width: 120px; }
  .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: .05em; color: #999; margin-bottom: 4px; }
  .kpi-val { font-size: 16px; font-weight: 800; color: #1a1a2e; }
  .kpi-sub { font-size: 9px; color: #bbb; margin-top: 2px; }
  .kpi-dark { background: #1a1a2e; }
  .kpi-dark .kpi-label { color: rgba(255,255,255,.5); }
  .kpi-dark .kpi-val { color: #f0c840; }
  .kpi-dark .kpi-sub { color: rgba(255,255,255,.3); }
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #666; margin: 16px 0 7px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: white; padding: 5px 7px; text-align: left; font-size: 8.5px; letter-spacing: .04em; }
  td { padding: 4px 7px; border-bottom: 1px solid #f0f0f0; font-size: 9.5px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .r { text-align: right; }
  .b { font-weight: 700; }
  .badge-procesada   { background: #d4f0e2; color: #16784a; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; }
  .badge-anulada     { background: #fde8e5; color: #c0392b; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; }
  .badge-pendiente   { background: #fdf0dc; color: #9e5a00; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; }
  .badge-reembolsada { background: #fff3e0; color: #b85c00; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; }
  .badge-devuelta    { background: #e3f2fd; color: #1565c0; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; }
  .footer { margin-top: 18px; color: #ccc; font-size: 8px; border-top: 1px solid #eee; padding-top: 6px; }
  @media print { body { padding: 10px 16px; } }
</style>
</head>
<body>
  <h1>RestSys — Ventas · ${filtroLabel}</h1>
  <p class="sub">Período: ${periodo} &nbsp;·&nbsp; Generado: ${new Date().toLocaleString('es-CL')}</p>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">🏢 Pensionados</div>
      <div class="kpi-val">${sumPens.length}</div>
      <div class="kpi-sub">${sumPens.length === 1 ? 'servicio' : 'servicios'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">👤 Particular</div>
      <div class="kpi-val">${formatPeso(totalPart)}</div>
      <div class="kpi-sub">${sumPart.length} ventas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">🧾 Factura</div>
      <div class="kpi-val">${formatPeso(totalFact)}</div>
      <div class="kpi-sub">${sumFact.length} ventas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">👥 Personal</div>
      <div class="kpi-val">${sumPers.length}</div>
      <div class="kpi-sub">${sumPers.length === 1 ? 'consumo' : 'consumos'}</div>
    </div>
    <div class="kpi kpi-dark">
      <div class="kpi-label">💰 Total cobrado</div>
      <div class="kpi-val">${formatPeso(totalCobrado)}</div>
      <div class="kpi-sub">Particular + Factura</div>
    </div>
  </div>

  <h2>Detalle de ventas (${ventasFiltradas.length})</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Fecha / Hora</th><th>Tipo</th><th>Cliente</th><th>Mesa</th><th>Pago</th><th>Total</th><th>Estado</th></tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="8" style="text-align:center;color:#bbb;padding:12px">Sin ventas en este período</td></tr>'}
    </tbody>
  </table>

  <p class="footer">RestSys — Sistema de Gestión de Ventas e Inventario</p>
</body></html>`;

    const win = window.open('', '_blank', 'width=920,height=720');
    if (!win) { setToast('Activa las ventanas emergentes del navegador para exportar PDF'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const exportarCSV = () => {
    const header = 'ID,Fecha,Tipo,Cliente,Mesa,Método pago,Total,Estado\n';
    const rows = ventasFiltradas.map(v =>
      `${v.id},"${formatFechaHora(v.creadaEn)}","${TIPO_CLIENTE_LABEL[v.tipoCliente]}","${v.nombreCliente || v.empleado?.nombre || '-'}","${v.mesa || '-'}","${v.metodoPago ? METODO_PAGO_LABEL[v.metodoPago] : '-'}",${v.total},"${v.estado}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ventas-${fechas.desde}.csv`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Barra de filtros */}
      <div style={{
        padding: '10px 18px', background: 'var(--s)',
        borderBottom: '1.5px solid var(--bd)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          PERÍODO:
        </span>
        <input
          type="date" className="inp" style={{ width: 150 }}
          value={fechas.desde}
          onChange={e => setFechas(f => ({ ...f, desde: e.target.value }))}
        />
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>→</span>
        <input
          type="date" className="inp" style={{ width: 150 }}
          value={fechas.hasta}
          onChange={e => setFechas(f => ({ ...f, hasta: e.target.value }))}
        />
        <button className="btn-primary" onClick={cargar} style={{ height: 36 }}>
          {cargando ? '⏳' : '🔍 Buscar'}
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--bd)', margin: '0 4px' }} />

        {/* Chips de tipo cliente */}
        {CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => setFiltroTipo(chip.key)}
            style={{
              height: 32, padding: '0 13px', borderRadius: 20,
              border: `1.5px solid ${filtroTipo === chip.key ? chip.border : 'var(--bd)'}`,
              background: filtroTipo === chip.key ? chip.bg : 'transparent',
              color: filtroTipo === chip.key ? chip.color : 'var(--text3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all .12s',
            }}
          >{chip.label}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {ventasFiltradas.filter(v => v.estado !== 'ANULADA').length} ventas
          </span>
          <button className="btn-sec" onClick={exportarCSV} style={{ height: 36 }}>
            ⬇ CSV
          </button>
          <button className="btn-sec" onClick={exportarPDF} style={{ height: 36 }}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div style={{
        display: 'flex', gap: 10, padding: '12px 18px',
        background: 'var(--bg)', borderBottom: '1.5px solid var(--bd)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Pensionados */}
        <div style={{
          flex: 1, minWidth: 140, background: 'var(--s)', borderRadius: 10,
          border: '1.5px solid #b8a4d8', padding: '10px 14px',
          boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--c-pens)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            🏢 Pensionados
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {sumPens.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {sumPens.length === 1 ? 'servicio' : 'servicios'}
          </div>
        </div>

        {/* Particular */}
        <div style={{
          flex: 1, minWidth: 140, background: 'var(--s)', borderRadius: 10,
          border: '1.5px solid #8ed4b0', padding: '10px 14px',
          boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--c-part)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            👤 Particular
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatPeso(totalPart)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {sumPart.length} {sumPart.length === 1 ? 'venta' : 'ventas'} cobradas
          </div>
        </div>

        {/* Factura */}
        <div style={{
          flex: 1, minWidth: 140, background: 'var(--s)', borderRadius: 10,
          border: '1.5px solid #8ab8e8', padding: '10px 14px',
          boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--c-fact)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            🧾 Factura
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatPeso(totalFact)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {sumFact.length} {sumFact.length === 1 ? 'venta' : 'ventas'} cobradas
          </div>
        </div>

        {/* Personal */}
        <div style={{
          flex: 1, minWidth: 140, background: 'var(--s)', borderRadius: 10,
          border: '1.5px solid #e0b87a', padding: '10px 14px',
          boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--c-pers)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            👥 Personal
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {sumPers.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {sumPers.length === 1 ? 'consumo' : 'consumos'}
          </div>
        </div>

        {/* Total cobrado */}
        <div style={{
          flex: 1, minWidth: 160, background: 'var(--navy)', borderRadius: 10,
          border: '1.5px solid rgba(255,255,255,.1)', padding: '10px 14px',
          boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            💰 Total cobrado
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#f0c840', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatPeso(totalCobrado)}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
            Particular + Factura
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
        {ventasFiltradas.length === 0 && !cargando ? (
          <div className="empty-state">
            <div className="empty-state-ico">📋</div>
            <p>No hay ventas en este período</p>
          </div>
        ) : (
          <table className="tabla" style={{ background: 'var(--s)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Mesa</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => {
                const badge = ESTADO_BADGE[v.estado] ?? { cls: 'badge-orange', label: v.estado };
                const esFinal = ESTADOS_FINALES.includes(v.estado);
                return (
                  <tr key={v.id} style={{ opacity: esFinal ? .55 : 1 }}>
                    <td style={{ fontWeight: 700, color: 'var(--text3)', fontSize: 11 }}>#{v.id}</td>
                    <td style={{ fontSize: 11, color: 'var(--text2)' }}>{formatFechaHora(v.creadaEn)}</td>
                    <td>
                      <span className={TIPO_BADGE[v.tipoCliente]}>
                        {TIPO_CLIENTE_LABEL[v.tipoCliente]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>
                      {v.nombreCliente || v.empleado?.nombre || <span style={{ color: 'var(--text3)' }}>—</span>}
                      {v.empleado && (
                        <div style={{ fontSize: 10, color: 'var(--c-pens)' }}>
                          {v.empleado.empresa?.nombre}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 11 }}>{v.mesa || '—'}</td>
                    <td style={{ fontSize: 11 }}>
                      {v.metodoPago ? METODO_PAGO_LABEL[v.metodoPago] : '—'}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
                      {v.tipoCliente === 'PERSONAL' ? (
                        <span style={{ fontSize: 10, color: 'var(--c-pers)' }}>Sin cobro</span>
                      ) : formatPeso(v.total)}
                      {v.propina! > 0 && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-part)', marginTop: 1 }}>
                          +{formatPeso(v.propina!)} propina
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, position: 'relative' }}>
                        <button
                          onClick={() => setVentaDetalle(v)}
                          style={{
                            height: 26, padding: '0 8px', fontSize: 10.5, fontWeight: 700,
                            background: 'var(--s2)', border: '1.5px solid var(--bd)',
                            borderRadius: 4, cursor: 'pointer',
                          }}>Ver</button>
                        {!esFinal && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (menuEstado?.id === v.id) { setMenuEstado(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuEstado({ id: v.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            }}
                            style={{
                              height: 26, padding: '0 8px', fontSize: 10.5, fontWeight: 700,
                              background: 'var(--red-bg)', color: 'var(--red)',
                              border: '1.5px solid #f4a99a', borderRadius: 4, cursor: 'pointer',
                            }}>Estado ▾</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Dropdown estado — fixed para no ser recortado por overflow */}
      {menuEstado && (
        <div
          style={{
            position: 'fixed', top: menuEstado.top, right: menuEstado.right,
            zIndex: 9999,
            background: 'var(--s)', border: '1.5px solid var(--bd)',
            borderRadius: 6, boxShadow: '0 8px 28px rgba(0,0,0,.18)',
            overflow: 'hidden', minWidth: 160,
          }}
          onClick={e => e.stopPropagation()}
        >
          {OPCIONES_ESTADO.map((op, idx) => (
            <button
              key={op.estado}
              onClick={e => { e.stopPropagation(); cambiarEstado(menuEstado.id, op.estado); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                color: op.color, background: op.bg,
                borderBottom: idx < OPCIONES_ESTADO.length - 1 ? '1px solid var(--bd)' : 'none',
              }}
            >{op.label}</button>
          ))}
        </div>
      )}

      {/* Confirm cambio estado */}
      {confirmEstado && (
        <ConfirmModal
          message={`¿${confirmEstado.label} la venta #${confirmEstado.id}?`}
          confirmLabel={confirmEstado.label.replace(/^[^\s]+ /, '')}
          confirmColor={OPCIONES_ESTADO.find(o => o.estado === confirmEstado.estado)?.color ?? '#c0351a'}
          onConfirm={confirmarCambioEstado}
          onCancel={() => setConfirmEstado(null)}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />

      {/* Modal detalle */}
      {ventaDetalle && (
        <div className="modal-overlay" onClick={() => setVentaDetalle(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Detalle venta #{ventaDetalle.id}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 14, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text3)' }}>Fecha: </span>{formatFechaHora(ventaDetalle.creadaEn)}</div>
              <div><span style={{ color: 'var(--text3)' }}>Tipo: </span><span className={`badge ${TIPO_BADGE[ventaDetalle.tipoCliente]?.split(' ')[1]}`}>{TIPO_CLIENTE_LABEL[ventaDetalle.tipoCliente]}</span></div>
              {ventaDetalle.nombreCliente && <div><span style={{ color: 'var(--text3)' }}>Cliente: </span>{ventaDetalle.nombreCliente}</div>}
              {ventaDetalle.mesa && <div><span style={{ color: 'var(--text3)' }}>Mesa: </span>{ventaDetalle.mesa}</div>}
              {ventaDetalle.metodoPago && <div><span style={{ color: 'var(--text3)' }}>Pago: </span>{METODO_PAGO_LABEL[ventaDetalle.metodoPago]}</div>}
              {ventaDetalle.garzon && <div><span style={{ color: 'var(--text3)' }}>Garzón: </span>{ventaDetalle.garzon}</div>}
            </div>
            <table className="tabla" style={{ marginBottom: 12 }}>
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
              <tbody>
                {ventaDetalle.items?.map(item => (
                  <tr key={item.id}>
                    <td>{item.nombreProducto}</td>
                    <td>{item.cantidad}</td>
                    <td>{formatPeso(item.precioUnitario)}</td>
                    <td style={{ fontWeight: 700 }}>{formatPeso(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)', marginBottom: 14 }}>
              Total: {formatPeso(ventaDetalle.total)}
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setVentaDetalle(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasPage;
