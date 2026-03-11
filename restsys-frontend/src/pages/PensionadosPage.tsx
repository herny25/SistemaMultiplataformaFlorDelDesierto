import React, { useEffect, useState, useRef } from 'react';
import { pensionadosApi } from '../services/api';
import type { Empresa, Empleado, PeriodoFacturacion } from '../types';
import { formatPeso, nombreMes } from '../utils/format';
import Toast from '../components/Toast';

const ESTADO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PENDIENTE: { bg: 'var(--orange-bg)', color: 'var(--orange)',  border: '#f4c68a' },
  FACTURADO: { bg: 'var(--c-fact-bg)', color: 'var(--c-fact)', border: '#8ab8e8' },
  PAGADO:    { bg: 'var(--green-bg)',  color: 'var(--green)',  border: '#8ed4b0' },
};

type ModoEmpleado = 'crear' | 'editar';
type CsvFila = { nombre: string; rut: string; cargo: string };

// ── CSV parser ────────────────────────────────────────────────────────────────
const parsearCSV = (texto: string): CsvFila[] => {
  const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const inicio = lineas[0].toLowerCase().includes('nombre') || lineas[0].toLowerCase().includes('rut') ? 1 : 0;
  return lineas.slice(inicio).map(l => {
    const partes = l.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    return { nombre: partes[0] || '', rut: partes[1] || '', cargo: partes[2] || '' };
  }).filter(r => r.nombre.trim() && r.rut.trim());
};

// ── Componente principal ──────────────────────────────────────────────────────
const PensionadosPage: React.FC = () => {
  const [empresas, setEmpresas]                     = useState<Empresa[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);
  const [empleados, setEmpleados]                   = useState<Empleado[]>([]);
  const [periodos, setPeriodos]                     = useState<PeriodoFacturacion[]>([]);
  const [tab, setTab]                               = useState<'empleados' | 'periodos'>('empleados');

  // Modal empresa
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [empresaEditId, setEmpresaEditId] = useState<number | null>(null);
  const [formEmpresa, setFormEmpresa]   = useState({ nombre: '', rut: '', contacto: '', telefono: '', email: '', descripcion: '' });

  // Modal empleado (crear/editar)
  const [modalEmpleado, setModalEmpleado]   = useState<ModoEmpleado | null>(null);
  const [empleadoEdit, setEmpleadoEdit]     = useState<Empleado | null>(null);
  const [formEmpleado, setFormEmpleado]     = useState({ nombre: '', rut: '', cargo: '', activo: true });

  // Modal CSV
  const [modalCSV, setModalCSV]       = useState(false);
  const [csvPreview, setCsvPreview]   = useState<CsvFila[]>([]);
  const [csvError, setCsvError]       = useState('');
  const [importando, setImportando]   = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [guardando, setGuardando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [estadoEdit, setEstadoEdit] = useState<Record<number, string>>({});
  const [toast, setToast] = useState('');

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    pensionadosApi.getEmpresas().then(setEmpresas).catch(console.error);
  }, []);

  const seleccionarEmpresa = async (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa);
    const [emps, pers] = await Promise.all([
      pensionadosApi.getEmpleados(empresa.id),
      pensionadosApi.getPeriodos(empresa.id),
    ]);
    setEmpleados(emps);
    setPeriodos(pers);
  };

  // ── Empresa ───────────────────────────────────────────────────────────────
  const FORM_EMPRESA_VACIO = { nombre: '', rut: '', contacto: '', telefono: '', email: '', descripcion: '' };

  const abrirEditarEmpresa = (emp: Empresa) => {
    setEmpresaEditId(emp.id);
    setFormEmpresa({ nombre: emp.nombre, rut: emp.rut || '', contacto: emp.contacto || '', telefono: emp.telefono || '', email: emp.email || '', descripcion: emp.descripcion || '' });
    setModalEmpresa(true);
  };

  const guardarEmpresa = async () => {
    setGuardando(true);
    try {
      if (empresaEditId) {
        const actualizada = await pensionadosApi.updateEmpresa(empresaEditId, formEmpresa);
        setEmpresas(prev => prev.map(e => e.id === empresaEditId ? { ...e, ...actualizada } : e));
        if (empresaSeleccionada?.id === empresaEditId) setEmpresaSeleccionada(a => a ? { ...a, ...actualizada } : a);
      } else {
        const nueva = await pensionadosApi.createEmpresa(formEmpresa);
        setEmpresas(prev => [...prev, nueva]);
      }
      setModalEmpresa(false);
      setEmpresaEditId(null);
      setFormEmpresa(FORM_EMPRESA_VACIO);
    } catch { setToast('Error al guardar empresa'); }
    finally { setGuardando(false); }
  };

  // ── Empleado ──────────────────────────────────────────────────────────────
  const abrirCrearEmpleado = () => {
    setFormEmpleado({ nombre: '', rut: '', cargo: '', activo: true });
    setEmpleadoEdit(null);
    setModalEmpleado('crear');
  };

  const abrirEditarEmpleado = (emp: Empleado) => {
    setFormEmpleado({ nombre: emp.nombre, rut: emp.rut, cargo: emp.cargo || '', activo: emp.activo });
    setEmpleadoEdit(emp);
    setModalEmpleado('editar');
  };

  const guardarEmpleado = async () => {
    if (!empresaSeleccionada) return;
    setGuardando(true);
    try {
      if (modalEmpleado === 'crear') {
        const nuevo = await pensionadosApi.createEmpleado({ ...formEmpleado, empresaId: empresaSeleccionada.id });
        setEmpleados(prev => [...prev, nuevo]);
      } else if (empleadoEdit) {
        const actualizado = await pensionadosApi.updateEmpleado(empleadoEdit.id, formEmpleado);
        setEmpleados(prev => prev.map(e => e.id === empleadoEdit.id ? actualizado : e));
      }
      setModalEmpleado(null);
    } catch { setToast('Error al guardar empleado'); }
    finally { setGuardando(false); }
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const abrirModalCSV = () => {
    setCsvPreview([]);
    setCsvError('');
    setImportResult(null);
    setModalCSV(true);
  };

  const onCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const texto = ev.target?.result as string;
      const filas = parsearCSV(texto);
      if (filas.length === 0) {
        setCsvError('No se encontraron filas válidas. Verifica el formato.');
        setCsvPreview([]);
      } else {
        setCsvError('');
        setCsvPreview(filas);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const importarCSV = async () => {
    if (!empresaSeleccionada || csvPreview.length === 0) return;
    setImportando(true);
    let ok = 0; let fail = 0;
    for (const fila of csvPreview) {
      try {
        const nuevo = await pensionadosApi.createEmpleado({ ...fila, empresaId: empresaSeleccionada.id, activo: true });
        setEmpleados(prev => [...prev, nuevo]);
        ok++;
      } catch { fail++; }
    }
    setImportResult({ ok, fail });
    setImportando(false);
    setCsvPreview([]);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // ── Períodos ──────────────────────────────────────────────────────────────
  const cambiarEstadoPeriodo = async (periodoId: number, estado: string) => {
    try {
      const actualizado = await pensionadosApi.updateEstadoPeriodo(periodoId, estado);
      setPeriodos(prev => prev.map(p => p.id === periodoId ? actualizado : p));
      setEstadoEdit(prev => { const n = { ...prev }; delete n[periodoId]; return n; });
    } catch { setToast('Error al actualizar estado'); }
  };

  const recalcularTotales = async () => {
    if (!empresaSeleccionada) return;
    setRecalculando(true);
    try {
      const actualizados = await Promise.all(periodos.map(p => pensionadosApi.recalcularTotal(p.id)));
      setPeriodos(prev => prev.map(p => actualizados.find(a => a.id === p.id) ?? p));
    } catch { setToast('Error al recalcular totales'); }
    finally { setRecalculando(false); }
  };

  // ── Imprimir planilla ─────────────────────────────────────────────────────
  const imprimirPlanilla = () => {
    if (!empresaSeleccionada) return;
    const fecha = new Date().toLocaleDateString('es-CL');

    const filasEmpleados = [...empleados]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><b>${e.nombre}</b></td>
          <td style="font-family:monospace">${e.rut}</td>
          <td>${e.cargo || '—'}</td>
          <td style="text-align:center">${e.activo ? '✓ Activo' : 'Inactivo'}</td>
          <td></td>
        </tr>`).join('');

    const filasPeriodos = [...periodos]
      .sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      .map(p => `
        <tr>
          <td>${nombreMes(p.mes)} ${p.anio}</td>
          <td style="text-align:right; font-weight:700">${formatPeso(p.totalMonto)}</td>
          <td>${p.estado}</td>
          <td>${p.fechaFacturado ? new Date(p.fechaFacturado).toLocaleDateString('es-CL') : '—'}</td>
          <td>${p.fechaPagado ? new Date(p.fechaPagado).toLocaleDateString('es-CL') : '—'}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Planilla — ${empresaSeleccionada.nombre}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 24px 32px; }
  .header { border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .empresa-nombre { font-size: 20px; font-weight: 800; }
  .empresa-info { font-size: 10px; color: #666; margin-top: 4px; }
  .fecha { font-size: 10px; color: #999; text-align: right; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #555; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: white; padding: 6px 8px; text-align: left; font-size: 9.5px; letter-spacing: .04em; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10.5px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .firma { margin-top: 40px; display: flex; gap: 60px; }
  .firma-item { text-align: center; }
  .firma-linea { border-top: 1px solid #999; width: 180px; margin: 0 auto 6px; padding-top: 4px; }
  .footer { margin-top: 24px; color: #bbb; font-size: 8.5px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 12px 18px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="empresa-nombre">${empresaSeleccionada.nombre}</div>
      <div class="empresa-info">
        ${empresaSeleccionada.rut ? `RUT: ${empresaSeleccionada.rut}` : ''}
        ${empresaSeleccionada.contacto ? ` &nbsp;·&nbsp; Contacto: ${empresaSeleccionada.contacto}` : ''}
        ${empresaSeleccionada.email ? ` &nbsp;·&nbsp; ${empresaSeleccionada.email}` : ''}
        ${empresaSeleccionada.telefono ? ` &nbsp;·&nbsp; Tel: ${empresaSeleccionada.telefono}` : ''}
      </div>
    </div>
    <div class="fecha">
      <div><b>Planilla de Pensionados</b></div>
      <div>Emitida: ${fecha}</div>
      <div>${empleados.length} empleado${empleados.length !== 1 ? 's' : ''} registrado${empleados.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <h2>Nómina de empleados</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Nombre</th><th>RUT</th><th>Cargo</th><th style="text-align:center">Estado</th><th>Firma</th></tr>
    </thead>
    <tbody>
      ${filasEmpleados || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:12px">Sin empleados registrados</td></tr>'}
    </tbody>
  </table>

  ${periodos.length > 0 ? `
  <h2>Historial de períodos de facturación</h2>
  <table>
    <thead>
      <tr><th>Período</th><th style="text-align:right">Total</th><th>Estado</th><th>Fecha factura</th><th>Fecha pago</th></tr>
    </thead>
    <tbody>${filasPeriodos}</tbody>
  </table>
  ` : ''}

  <div class="firma">
    <div class="firma-item">
      <div class="firma-linea">Responsable del casino</div>
    </div>
    <div class="firma-item">
      <div class="firma-linea">Representante empresa</div>
    </div>
  </div>

  <p class="footer">RestSys — Sistema de Gestión de Ventas e Inventario &nbsp;·&nbsp; Generado el ${fecha}</p>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=720');
    if (!win) { setToast('Activa las ventanas emergentes del navegador para imprimir'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* ── SIDEBAR empresas ── */}
      <aside style={{
        width: 260, background: 'var(--s2)', borderRight: '1.5px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '10px 13px', borderBottom: '1.5px solid var(--bd)',
          background: 'var(--navy)', display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'white', flex: 1 }}>🏢 Empresas</span>
          <span style={{
            background: 'rgba(255,255,255,.2)', color: 'white', fontSize: 10, fontWeight: 800,
            minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{empresas.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 7 }}>
          {empresas.map(emp => (
            <div
              key={emp.id}
              onClick={() => seleccionarEmpresa(emp)}
              style={{
                padding: '9px 11px', borderRadius: 'var(--r-sm)', marginBottom: 5, cursor: 'pointer',
                background: empresaSeleccionada?.id === emp.id ? 'var(--c-pens-bg)' : 'var(--s)',
                border: `1.5px solid ${empresaSeleccionada?.id === emp.id ? 'var(--c-pens)' : 'var(--bd)'}`,
                transition: 'all .13s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{emp.nombre}</div>
              {emp.rut && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{emp.rut}</div>}
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                {emp.empleados?.length ?? 0} empleados
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 7 }}>
          <button
            onClick={() => { setEmpresaEditId(null); setFormEmpresa(FORM_EMPRESA_VACIO); setModalEmpresa(true); }}
            style={{
              width: '100%', height: 34, background: 'var(--s)',
              border: '1.5px dashed var(--bd2)', borderRadius: 'var(--r-sm)',
              fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer',
            }}
          >+ Nueva empresa</button>
        </div>
      </aside>

      {/* ── PANEL DERECHO ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!empresaSeleccionada ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-ico">👈</div>
            <p>Selecciona una empresa para ver sus datos</p>
          </div>
        ) : (
          <>
            {/* Header empresa */}
            <div style={{
              padding: '10px 18px', background: 'var(--s)',
              borderBottom: '1.5px solid var(--bd)', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
                  {empresaSeleccionada.nombre}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 3, fontSize: 11, color: 'var(--text3)', flexWrap: 'wrap' }}>
                  {empresaSeleccionada.rut      && <span>RUT: {empresaSeleccionada.rut}</span>}
                  {empresaSeleccionada.contacto && <span>Contacto: {empresaSeleccionada.contacto}</span>}
                  {empresaSeleccionada.email    && <span>{empresaSeleccionada.email}</span>}
                  {empresaSeleccionada.telefono && <span>Tel: {empresaSeleccionada.telefono}</span>}
                </div>
                {empresaSeleccionada.descripcion && (
                  <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text2)', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 5, padding: '4px 8px', whiteSpace: 'pre-wrap', maxWidth: 520 }}>
                    {empresaSeleccionada.descripcion}
                  </div>
                )}
              </div>
              <button
                onClick={() => abrirEditarEmpresa(empresaSeleccionada)}
                style={{
                  height: 34, padding: '0 12px', fontSize: 12, fontWeight: 700,
                  background: 'var(--s2)', border: '1.5px solid var(--bd)',
                  borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                }}
              >✏️ Editar</button>
              <button
                onClick={imprimirPlanilla}
                style={{
                  height: 34, padding: '0 14px', fontSize: 12, fontWeight: 700,
                  background: 'var(--s2)', border: '1.5px solid var(--bd)',
                  borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                }}
              >🖨️ Imprimir planilla</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--bd)', background: 'var(--s)', flexShrink: 0 }}>
              {[
                { id: 'empleados', label: `👥 Empleados (${empleados.length})` },
                { id: 'periodos',  label: `📅 Períodos de facturación` },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  style={{
                    padding: '10px 18px', fontWeight: 700, fontSize: 12,
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    borderBottom: tab === t.id ? '2.5px solid var(--navy)' : '2.5px solid transparent',
                    color: tab === t.id ? 'var(--navy)' : 'var(--text3)',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>

              {/* ── TAB EMPLEADOS ── */}
              {tab === 'empleados' && (
                <>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }}>
                    <button
                      className="btn-sec"
                      style={{ height: 34, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5 }}
                      onClick={abrirModalCSV}
                    >📥 Importar CSV</button>
                    <button
                      className="btn-primary"
                      style={{ height: 34, fontSize: 12 }}
                      onClick={abrirCrearEmpleado}
                    >+ Agregar empleado</button>
                  </div>

                  {empleados.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-ico">👤</div>
                      <p>Sin empleados registrados</p>
                    </div>
                  ) : (
                    <table className="tabla" style={{ background: 'var(--s)', borderRadius: 'var(--r)', boxShadow: 'var(--sh-xs)' }}>
                      <thead>
                        <tr><th>Nombre</th><th>RUT</th><th>Cargo</th><th>Estado</th><th></th></tr>
                      </thead>
                      <tbody>
                        {empleados.map(e => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.rut}</td>
                            <td style={{ color: 'var(--text2)' }}>{e.cargo || '—'}</td>
                            <td>
                              <span className={`badge ${e.activo ? 'badge-ok' : 'badge-red'}`}>
                                {e.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => abrirEditarEmpleado(e)}
                                style={{
                                  height: 26, padding: '0 10px', fontSize: 10.5, fontWeight: 700,
                                  background: 'var(--s2)', border: '1.5px solid var(--bd)',
                                  borderRadius: 4, cursor: 'pointer', color: 'var(--text2)',
                                }}
                              >✏️ Editar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ── TAB PERÍODOS ── */}
              {tab === 'periodos' && (
                periodos.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-ico">📅</div>
                    <p>Sin períodos registrados.<br />Se crean automáticamente cuando hay ventas de pensionados.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <button
                        onClick={recalcularTotales}
                        disabled={recalculando}
                        style={{
                          height: 32, padding: '0 14px', fontSize: 11.5, fontWeight: 700,
                          background: 'var(--s2)', border: '1.5px solid var(--bd)',
                          borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text2)',
                        }}
                      >{recalculando ? '⏳ Recalculando...' : '↻ Recalcular totales'}</button>
                    </div>
                    <table className="tabla" style={{ background: 'var(--s)', borderRadius: 'var(--r)', boxShadow: 'var(--sh-xs)' }}>
                      <thead>
                        <tr><th>Período</th><th>Total</th><th>Estado actual</th><th>Cambiar estado</th></tr>
                      </thead>
                      <tbody>
                        {periodos.map(p => {
                          const seleccionado = estadoEdit[p.id] ?? '';
                          const cambioDistinto = seleccionado && seleccionado !== p.estado;
                          return (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 700 }}>{nombreMes(p.mes)} {p.anio}</td>
                              <td style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                                {formatPeso(p.totalMonto)}
                              </td>
                              <td>
                                <span style={{
                                  background: ESTADO_COLORS[p.estado].bg,
                                  color: ESTADO_COLORS[p.estado].color,
                                  border: `1px solid ${ESTADO_COLORS[p.estado].border}`,
                                  padding: '3px 9px', borderRadius: 4,
                                  fontSize: 10, fontWeight: 800, display: 'inline-block',
                                }}>{p.estado}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select
                                    value={seleccionado}
                                    onChange={e => setEstadoEdit(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    style={{
                                      height: 28, padding: '0 8px', fontSize: 11.5, fontWeight: 600,
                                      border: '1.5px solid var(--bd)', borderRadius: 4,
                                      background: 'var(--s)', color: 'var(--text)', cursor: 'pointer',
                                    }}
                                  >
                                    <option value="">— Seleccionar —</option>
                                    {p.estado !== 'PENDIENTE'  && <option value="PENDIENTE">Pendiente</option>}
                                    {p.estado !== 'FACTURADO'  && <option value="FACTURADO">Facturado</option>}
                                    {p.estado !== 'PAGADO'     && <option value="PAGADO">Pagado</option>}
                                  </select>
                                  {cambioDistinto && (
                                    <button
                                      onClick={() => cambiarEstadoPeriodo(p.id, seleccionado)}
                                      style={{
                                        height: 28, padding: '0 10px', fontSize: 11, fontWeight: 700,
                                        background: 'var(--navy)', color: 'white',
                                        border: 'none', borderRadius: 4, cursor: 'pointer',
                                      }}
                                    >Confirmar</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL NUEVA EMPRESA ── */}
      {modalEmpresa && (
        <div className="modal-overlay" onClick={() => { setModalEmpresa(false); setEmpresaEditId(null); setFormEmpresa(FORM_EMPRESA_VACIO); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{empresaEditId ? '✏️ Editar empresa' : 'Nueva empresa con convenio'}</div>
            {(['nombre', 'rut', 'contacto', 'telefono', 'email'] as const).map(k => (
              <input key={k} className="inp" style={{ marginBottom: 8 }}
                placeholder={k === 'nombre' ? 'Nombre de la empresa *' : k.charAt(0).toUpperCase() + k.slice(1)}
                value={formEmpresa[k]}
                onChange={e => setFormEmpresa(f => ({ ...f, [k]: e.target.value }))} />
            ))}
            <textarea
              className="inp"
              style={{ marginBottom: 8, resize: 'vertical', minHeight: 72, fontFamily: 'inherit', fontSize: 13 }}
              placeholder="Descripción / reglas del convenio (opcional)"
              value={formEmpresa.descripcion}
              onChange={e => setFormEmpresa(f => ({ ...f, descripcion: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => { setModalEmpresa(false); setEmpresaEditId(null); setFormEmpresa(FORM_EMPRESA_VACIO); }}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={guardarEmpresa}
                disabled={guardando || !formEmpresa.nombre}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EMPLEADO (crear/editar) ── */}
      {modalEmpleado && (
        <div className="modal-overlay" onClick={() => setModalEmpleado(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {modalEmpleado === 'crear' ? `➕ Nuevo empleado — ${empresaSeleccionada?.nombre}` : `✏️ Editar — ${empleadoEdit?.nombre}`}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>NOMBRE COMPLETO *</label>
              <input className="inp" placeholder="Nombre completo"
                value={formEmpleado.nombre} onChange={e => setFormEmpleado(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>RUT * (ej: 15.678.901-2)</label>
              <input className="inp" placeholder="15.678.901-2"
                value={formEmpleado.rut} onChange={e => setFormEmpleado(f => ({ ...f, rut: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>CARGO</label>
              <input className="inp" placeholder="Ej: Gerente, Administrativo..."
                value={formEmpleado.cargo} onChange={e => setFormEmpleado(f => ({ ...f, cargo: e.target.value }))} />
            </div>

            {/* Toggle activo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              padding: '8px 12px', background: 'var(--s2)', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--bd)',
            }}>
              <button
                onClick={() => setFormEmpleado(f => ({ ...f, activo: !f.activo }))}
                style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: formEmpleado.activo ? 'var(--green)' : 'var(--bd2)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: formEmpleado.activo ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, color: formEmpleado.activo ? 'var(--green)' : 'var(--text3)' }}>
                {formEmpleado.activo ? 'Empleado activo' : 'Empleado inactivo'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => setModalEmpleado(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={guardarEmpleado}
                disabled={guardando || !formEmpleado.nombre.trim() || !formEmpleado.rut.trim()}>
                {guardando ? 'Guardando...' : modalEmpleado === 'crear' ? 'Crear empleado' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTAR CSV ── */}
      {modalCSV && (
        <div className="modal-overlay" onClick={() => !importando && setModalCSV(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">📥 Importar empleados desde CSV — {empresaSeleccionada?.nombre}</div>

            {/* Formato esperado */}
            <div style={{
              background: 'var(--s2)', border: '1.5px solid var(--bd)', borderRadius: 6,
              padding: '10px 12px', marginBottom: 14, fontSize: 11,
            }}>
              <div style={{ fontWeight: 800, color: 'var(--text2)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Formato esperado del CSV:
              </div>
              <code style={{ fontSize: 11, color: 'var(--c-fact)', display: 'block', lineHeight: 1.7 }}>
                nombre,rut,cargo<br />
                Juan Pérez,12.345.678-9,Gerente<br />
                María López,9.876.543-2,Administrativo
              </code>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                La primera fila puede ser encabezado (se detecta automáticamente). Columna cargo es opcional.
              </div>
            </div>

            {/* Input archivo */}
            {!importResult && (
              <div style={{ marginBottom: 12 }}>
                <input
                  ref={csvInputRef}
                  type="file" accept=".csv,text/csv"
                  onChange={onCSVFile}
                  style={{ fontSize: 12, width: '100%' }}
                />
              </div>
            )}

            {/* Error */}
            {csvError && (
              <div style={{
                background: 'var(--red-bg)', color: 'var(--red)', fontSize: 11.5, fontWeight: 700,
                padding: '7px 10px', borderRadius: 5, marginBottom: 10,
              }}>⚠ {csvError}</div>
            )}

            {/* Resultado importación */}
            {importResult && (
              <div style={{
                background: 'var(--green-bg)', color: 'var(--green)', fontSize: 12, fontWeight: 700,
                padding: '10px 12px', borderRadius: 6, marginBottom: 12,
              }}>
                ✓ Importación completada: {importResult.ok} empleado{importResult.ok !== 1 ? 's' : ''} creado{importResult.ok !== 1 ? 's' : ''}
                {importResult.fail > 0 && <span style={{ color: 'var(--red)' }}> · {importResult.fail} fallido{importResult.fail !== 1 ? 's' : ''} (RUT duplicado u otro error)</span>}
              </div>
            )}

            {/* Preview tabla */}
            {csvPreview.length > 0 && !importResult && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Vista previa — {csvPreview.length} empleados a importar:
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--bd)', borderRadius: 6 }}>
                  <table className="tabla" style={{ margin: 0 }}>
                    <thead><tr><th>Nombre</th><th>RUT</th><th>Cargo</th></tr></thead>
                    <tbody>
                      {csvPreview.map((f, i) => (
                        <tr key={i}>
                          <td>{f.nombre}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.rut}</td>
                          <td style={{ color: 'var(--text2)' }}>{f.cargo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => setModalCSV(false)} disabled={importando}>
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!importResult && (
                <button
                  className="btn-primary" style={{ flex: 2 }}
                  onClick={importarCSV}
                  disabled={importando || csvPreview.length === 0}
                >
                  {importando ? `Importando... (${csvPreview.length} filas)` : `Importar ${csvPreview.length} empleado${csvPreview.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default PensionadosPage;
