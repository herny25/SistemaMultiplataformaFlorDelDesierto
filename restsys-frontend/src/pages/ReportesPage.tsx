import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ventasApi } from '../services/api';
import type { Venta, TipoCliente } from '../types';
import { formatPeso, formatFecha, TIPO_CLIENTE_LABEL, METODO_PAGO_LABEL } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Toast from '../components/Toast';

const COLORES_TIPO = ['#5a38a0', '#16784a', '#1a5cb5', '#9e5a00'];
const COLORES_PAGO = ['#22c97a', '#1a5cb5', '#b8820a', '#5a38a0'];

const CHIPS: { key: TipoCliente | ''; label: string; color: string; bg: string; border: string }[] = [
  { key: '',                   label: 'General',     color: 'var(--navy)',    bg: '#eef1f8',          border: '#9aadcc' },
  { key: 'PENSIONADO',         label: 'Pensionados', color: 'var(--c-pens)', bg: 'var(--c-pens-bg)', border: '#b8a4d8' },
  { key: 'PARTICULAR',         label: 'Particular',  color: 'var(--c-part)', bg: 'var(--c-part-bg)', border: '#8ed4b0' },
  { key: 'PARTICULAR_FACTURA', label: 'Factura',     color: 'var(--c-fact)', bg: 'var(--c-fact-bg)', border: '#8ab8e8' },
  { key: 'PERSONAL',           label: 'Personal',    color: 'var(--c-pers)', bg: 'var(--c-pers-bg)', border: '#e0b87a' },
];

const hoy = new Date().toISOString().split('T')[0];

const fmt = (f: string) => formatFecha(f + 'T12:00:00');

const ReportesPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [fechas, setFechas] = useState({ desde: hoy, hasta: hoy });
  const [filtroTipo, setFiltroTipo] = useState<TipoCliente | ''>('');
  const [cargando, setCargando] = useState(false);
  const [shortcut, setShortcut] = useState<'hoy' | 'semana' | 'mes' | null>('hoy');
  const [toast, setToast] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await ventasApi.getAll({ desde: fechas.desde, hasta: fechas.hasta });
      setVentas(data);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  }, [fechas]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Atajos de fecha ──────────────────────────────────────────────────────────
  const irHoy = () => { setFechas({ desde: hoy, hasta: hoy }); setShortcut('hoy'); };
  const irSemana = () => {
    const d = new Date();
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    setFechas({ desde: lunes.toISOString().split('T')[0], hasta: domingo.toISOString().split('T')[0] });
    setShortcut('semana');
  };
  const irMes = () => {
    const d = new Date();
    setFechas({
      desde: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      hasta: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
    });
    setShortcut('mes');
  };
  const shortcuts: [string, string, () => void][] = [
    ['hoy', 'Hoy', irHoy],
    ['semana', 'Semana', irSemana],
    ['mes', 'Mes', irMes],
  ];

  // ── Datos derivados ──────────────────────────────────────────────────────────
  const ventasActivas = useMemo(() => ventas.filter(v => v.estado !== 'ANULADA'), [ventas]);
  const ventasFiltradas = useMemo(() =>
    filtroTipo ? ventasActivas.filter(v => v.tipoCliente === filtroTipo) : ventasActivas,
    [ventasActivas, filtroTipo]);

  const totalPeriodo = useMemo(() => ventasFiltradas.reduce((a, v) => a + Number(v.total), 0), [ventasFiltradas]);
  const promedio = ventasFiltradas.length ? totalPeriodo / ventasFiltradas.length : 0;
  const totalCobrado = useMemo(() =>
    ventasActivas.filter(v => v.tipoCliente === 'PARTICULAR' || v.tipoCliente === 'PARTICULAR_FACTURA')
      .reduce((a, v) => a + Number(v.total), 0), [ventasActivas]);

  const porTipo = useMemo(() => {
    const t: Record<string, { count: number; total: number }> = {
      PENSIONADO: { count: 0, total: 0 }, PARTICULAR: { count: 0, total: 0 },
      PARTICULAR_FACTURA: { count: 0, total: 0 }, PERSONAL: { count: 0, total: 0 },
    };
    ventasActivas.forEach(v => { if (t[v.tipoCliente]) { t[v.tipoCliente].count++; t[v.tipoCliente].total += Number(v.total); } });
    return t;
  }, [ventasActivas]);

  const porPago = useMemo(() => {
    const p: Record<string, number> = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CUENTA: 0 };
    ventasFiltradas.forEach(v => { if (v.metodoPago && p[v.metodoPago] !== undefined) p[v.metodoPago] += Number(v.total); });
    return p;
  }, [ventasFiltradas]);

  const dataBarras = useMemo(() => {
    const por: Record<string, number> = {};
    ventasFiltradas.forEach(v => { const d = v.creadaEn.split('T')[0]; por[d] = (por[d] || 0) + Number(v.total); });
    return Object.entries(por).sort(([a], [b]) => a.localeCompare(b)).map(([f, total]) => ({ fecha: f.slice(5), total }));
  }, [ventasFiltradas]);

  const topProductos = useMemo(() => {
    const c: Record<string, number> = {};
    ventasFiltradas.forEach(v => v.items?.forEach(item => { c[item.nombreProducto] = (c[item.nombreProducto] || 0) + item.cantidad; }));
    return Object.entries(c).sort(([, a], [, b]) => b - a).slice(0, 8);
  }, [ventasFiltradas]);

  const dataTorta = [
    { name: 'Pensionados', value: porTipo.PENSIONADO.count },
    { name: 'Particular',  value: porTipo.PARTICULAR.count },
    { name: 'Factura',     value: porTipo.PARTICULAR_FACTURA.count },
    { name: 'Personal',    value: porTipo.PERSONAL.count },
  ].filter(d => d.value > 0);

  const dataPago = [
    { name: 'Efectivo',      value: porPago.EFECTIVO },
    { name: 'Tarjeta',       value: porPago.TARJETA },
    { name: 'Transf.',       value: porPago.TRANSFERENCIA },
    { name: 'Cuenta',        value: porPago.CUENTA },
  ].filter(d => d.value > 0);

  const chipActivo = CHIPS.find(c => c.key === filtroTipo)!;

  // ── Calcular asistencia pensionados agrupada por empresa ────────────────────
  const CATS_PENS = ['DESAYUNO', 'ALMUERZO', 'ALMUERZO_ESPECIAL', 'COLACION', 'COLACION_ESPECIAL', 'COLACION_MEDIA_MANANA', 'CENA', 'CENA_ESPECIAL', 'BEBIDA'] as const;
  type CatKey = typeof CATS_PENS[number];

  const CAT_LABEL: Record<CatKey, string> = {
    DESAYUNO: 'Desayuno',
    ALMUERZO: 'Almuerzo',
    ALMUERZO_ESPECIAL: 'Almuerzo Esp.',
    COLACION: 'Colación',
    COLACION_ESPECIAL: 'Colación Esp.',
    COLACION_MEDIA_MANANA: 'Col. Media Mañana',
    CENA: 'Cena',
    CENA_ESPECIAL: 'Cena Esp.',
    BEBIDA: 'Bebida',
  };

  const CONSUMOS_INICIALES = (): Record<CatKey, boolean> => ({
    DESAYUNO: false, ALMUERZO: false, ALMUERZO_ESPECIAL: false,
    COLACION: false, COLACION_ESPECIAL: false, COLACION_MEDIA_MANANA: false,
    CENA: false, CENA_ESPECIAL: false, BEBIDA: false,
  });

  const TOTALES_INICIALES = (): Record<CatKey, number> => ({
    DESAYUNO: 0, ALMUERZO: 0, ALMUERZO_ESPECIAL: 0,
    COLACION: 0, COLACION_ESPECIAL: 0, COLACION_MEDIA_MANANA: 0,
    CENA: 0, CENA_ESPECIAL: 0, BEBIDA: 0,
  });

  const calcularAsistenciaPorEmpresa = () => {
    const mapaEmp: Record<string, Record<number, { nombre: string; rut: string; consumos: Record<CatKey, boolean> }>> = {};
    ventasFiltradas
      .filter(v => v.tipoCliente === 'PENSIONADO' && v.empleado)
      .forEach(v => {
        const empresa = v.empleado!.empresa?.nombre || 'Sin empresa';
        const id = v.empleado!.id;
        if (!mapaEmp[empresa]) mapaEmp[empresa] = {};
        if (!mapaEmp[empresa][id])
          mapaEmp[empresa][id] = { nombre: v.empleado!.nombre, rut: v.empleado!.rut || '', consumos: CONSUMOS_INICIALES() };
        v.items.forEach(item => {
          const tm = (item.producto as any)?.tipoMenu?.toUpperCase() as CatKey;
          if (tm && (CATS_PENS as readonly string[]).includes(tm)) mapaEmp[empresa][id].consumos[tm] = true;
        });
      });
    return Object.entries(mapaEmp)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([empresa, empMap]) => {
        const empleados = Object.values(empMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const totales = TOTALES_INICIALES();
        empleados.forEach(e => CATS_PENS.forEach(c => { if (e.consumos[c]) totales[c]++; }));
        return { empresa, empleados, totales };
      });
  };

  // ── Exportar CSV ─────────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const suf = filtroTipo ? `_${filtroTipo.toLowerCase()}` : '_general';

    if (filtroTipo === 'PENSIONADO') {
      const grupos = calcularAsistenciaPorEmpresa();
      const gtot = TOTALES_INICIALES();

      // Colores para XLS
      const BG_HEADER  = '#1A1A2E';
      const FG_HEADER  = '#FFFFFF';
      const BG_TOTAL   = '#C8D4EE';
      const BG_GTOTAL  = '#8FA3CE';
      const BG_SI      = '#D6F0E3';
      const BG_NO      = '#FAD7D7';
      const BG_ALT     = '#F7F8FC';

      const th = (txt: string, extra = '', w = '') =>
        `<th style="background:${BG_HEADER};color:${FG_HEADER};font-weight:bold;padding:6px 8px;border:1px solid #444;white-space:nowrap;${w ? `width:${w};` : ''}${extra}">${txt}</th>`;
      const tdSI = `<td style="background:${BG_SI};color:#155724;font-weight:bold;text-align:center;padding:5px 8px;border:1px solid #ddd;">Consumo</td>`;
      const tdNO = `<td style="background:${BG_NO};color:#721c24;text-align:center;padding:5px 8px;border:1px solid #ddd;">No consumo</td>`;
      const tdC  = (v: boolean) => v ? tdSI : tdNO;
      const tdN  = (txt: string | number, extra = '') =>
        `<td style="padding:5px 8px;border:1px solid #ddd;${extra}">${txt}</td>`;
      const tdB  = (txt: string | number, bg: string) =>
        `<td style="background:${bg};font-weight:bold;text-align:center;padding:5px 8px;border:1px solid #ddd;">${txt}</td>`;

      const catHeaders = CATS_PENS.map(c => th(CAT_LABEL[c], 'text-align:center;', '90px')).join('');

      const bloques = grupos.map(({ empresa, empleados, totales }, gi) => {
        CATS_PENS.forEach(c => { gtot[c] += totales[c]; });
        const filas = empleados.map((e, i) => {
          const bg = i % 2 === 0 ? '#FFFFFF' : BG_ALT;
          const cats = CATS_PENS.map(c => tdC(e.consumos[c])).join('');
          return `<tr style="background:${bg}">
            ${tdN(e.nombre)}${tdN(e.rut, 'font-family:monospace;font-size:9pt;')}${cats}
          </tr>`;
        }).join('');
        const totCells = CATS_PENS.map(c => tdB(totales[c], BG_TOTAL)).join('');
        const bgEmp = gi % 2 === 0 ? '#2C3E6B' : '#3B5080';
        return `
          <tr><td colspan="${2 + CATS_PENS.length}" style="background:${bgEmp};color:#fff;font-weight:bold;padding:7px 10px;font-size:11pt;border:1px solid #1a1a2e;">${empresa}</td></tr>
          <tr>${th('Nombre','','180px')}${th('RUT','font-family:monospace;','110px')}${catHeaders}</tr>
          ${filas}
          <tr>${tdB('TOTAL EMPRESA', BG_TOTAL)}${tdB('', BG_TOTAL)}${totCells}</tr>
          <tr><td colspan="${2 + CATS_PENS.length}" style="height:8px;"></td></tr>`;
      }).join('');

      const gtotCells = CATS_PENS.map(c => tdB(gtot[c], BG_GTOTAL)).join('');
      const totalGeneral = grupos.length > 1
        ? `<tr>${tdB('TOTAL GENERAL', BG_GTOTAL)}${tdB('', BG_GTOTAL)}${gtotCells}</tr>`
        : '';

      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
          table { border-collapse: collapse; }
        </style></head>
        <body>
          <p style="font-size:14pt;font-weight:bold;color:#1A1A2E;">Reporte Pensionados</p>
          <p style="color:#666;margin-bottom:12px;">Período: ${fechas.desde} → ${fechas.hasta}</p>
          <table>${bloques}${totalGeneral}</table>
        </body></html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reporte${suf}_${fechas.desde}_${fechas.hasta}.xls`;
      a.click();
      return;
    }

    const header = 'ID,Fecha,Tipo,Cliente,Mesa,Método pago,Total,Estado\n';
    const rows = ventasFiltradas.map(v =>
      `${v.id},"${v.creadaEn}","${TIPO_CLIENTE_LABEL[v.tipoCliente]}","${v.nombreCliente || v.empleado?.nombre || '-'}","${v.mesa || '-'}","${v.metodoPago ? METODO_PAGO_LABEL[v.metodoPago] : '-'}",${v.total},"${v.estado}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte${suf}_${fechas.desde}_${fechas.hasta}.csv`;
    a.click();
  };

  // ── Exportar PDF (ventana de impresión) ──────────────────────────────────────
  const exportarPDF = () => {
    const titulo = `Reporte ${chipActivo.label}`;
    const periodo = `${fmt(fechas.desde)} → ${fmt(fechas.hasta)}`;

    let tablaAsistencia = '';
    if (filtroTipo === 'PENSIONADO') {
      const grupos = calcularAsistenciaPorEmpresa();
      if (grupos.length > 0) {
        const C = (v: boolean) => v
          ? '<span class="si">Consumo</span>'
          : '<span class="no">No consumo</span>';
        const gtot = TOTALES_INICIALES();
        const catThs = CATS_PENS.map(c => `<th class="c">${CAT_LABEL[c]}</th>`).join('');
        const bloques = grupos.map(({ empresa, empleados, totales }) => {
          CATS_PENS.forEach(c => { gtot[c] += totales[c]; });
          const filas = empleados.map(e => {
            const cats = CATS_PENS.map(c => `<td class="c">${C(e.consumos[c])}</td>`).join('');
            return `<tr>
              <td>${e.nombre}</td>
              <td class="mono">${e.rut}</td>
              ${cats}
            </tr>`;
          }).join('');
          const totCells = CATS_PENS.map(c => `<td class="c b">${totales[c]}</td>`).join('');
          return `
          <h2>${empresa}</h2>
          <table>
            <thead><tr><th>Nombre</th><th>RUT</th>${catThs}</tr></thead>
            <tbody>
              ${filas}
              <tr class="tot-row">
                <td><b>Total empresa</b></td><td></td>${totCells}
              </tr>
            </tbody>
          </table>`;
        }).join('');
        const gtotCells = CATS_PENS.map(c => `<td class="c b">${gtot[c]}</td>`).join('');
        const totalGeneral = grupos.length > 1 ? `
          <table style="margin-top:12px">
            <thead><tr><th>Total general</th><th></th>${catThs}</tr></thead>
            <tbody><tr class="gtot-row"><td><b>Todos</b></td><td></td>${gtotCells}</tr></tbody>
          </table>` : '';
        tablaAsistencia = bloques + totalGeneral;
      }
    }

    const filas = ventasFiltradas.map(v => `
      <tr>
        <td>#${v.id}</td>
        <td>${new Date(v.creadaEn).toLocaleDateString('es-CL')} ${new Date(v.creadaEn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${TIPO_CLIENTE_LABEL[v.tipoCliente]}</td>
        <td>${v.nombreCliente || v.empleado?.nombre || '—'}</td>
        <td>${v.metodoPago ? METODO_PAGO_LABEL[v.metodoPago] : '—'}</td>
        <td class="r b">${v.tipoCliente === 'PERSONAL' ? 'Sin cobro' : formatPeso(v.total)}</td>
        <td>${v.estado}</td>
      </tr>`).join('');

    const topRows = topProductos.map(([nombre, cant], i) =>
      `<tr><td>${i + 1}</td><td>${nombre}</td><td class="r b">${cant} uds.</td></tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10.5px; color: #1a1a2e; padding: 22px 28px; }
  h1 { font-size: 17px; color: #1a1a2e; }
  .sub { color: #777; font-size: 11px; margin: 3px 0 18px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #ddd; border-radius: 7px; padding: 10px 14px; flex: 1; }
  .kpi-label { font-size: 8.5px; text-transform: uppercase; letter-spacing: .05em; color: #999; margin-bottom: 5px; }
  .kpi-val { font-size: 17px; font-weight: 800; color: #1a1a2e; }
  .kpi-sub { font-size: 9.5px; color: #aaa; margin-top: 2px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: #fff; background: #2c3e6b; margin: 20px 0 0; padding: 8px 12px; border-radius: 6px 6px 0 0; }
  h2 + table { margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: white; padding: 6px 8px; text-align: left; font-size: 9px; letter-spacing: .04em; white-space: nowrap; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) td { background: #f7f8fc; }
  .r { text-align: right; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .mono { font-family: monospace; font-size: 9px; }
  .si { color: #155724; font-weight: bold; }
  .no { color: #721c24; }
  .tot-row td { background: #c8d4ee !important; font-weight: bold; }
  .gtot-row td { background: #8fa3ce !important; font-weight: bold; color: #fff; }
  .footer { margin-top: 22px; color: #bbb; font-size: 8.5px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 10px 16px; } .kpis { display: flex !important; } }
</style>
</head>
<body>
  <h1>RestSys — ${titulo}</h1>
  <p class="sub">Período: ${periodo} &nbsp;·&nbsp; Generado: ${new Date().toLocaleString('es-CL')}</p>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total ventas</div>
      <div class="kpi-val">${ventasFiltradas.length}</div>
      <div class="kpi-sub">activas en el período</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total período</div>
      <div class="kpi-val">${formatPeso(totalPeriodo)}</div>
      <div class="kpi-sub">promedio ${formatPeso(promedio)}</div>
    </div>
    ${filtroTipo === '' ? `
    <div class="kpi">
      <div class="kpi-label">Total cobrado real</div>
      <div class="kpi-val">${formatPeso(totalCobrado)}</div>
      <div class="kpi-sub">Particular + Factura</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Pensionados</div>
      <div class="kpi-val">${porTipo.PENSIONADO.count}</div>
      <div class="kpi-sub">servicios</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Personal</div>
      <div class="kpi-val">${porTipo.PERSONAL.count}</div>
      <div class="kpi-sub">consumos sin cobro</div>
    </div>
    ` : ''}
  </div>

  <h2>Detalle de ventas</h2>
  <table>
    <thead><tr><th>#</th><th>Fecha / Hora</th><th>Tipo</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:12px">Sin ventas en este período</td></tr>'}</tbody>
  </table>

  ${topProductos.length > 0 ? `
  <h2>Platillos más vendidos</h2>
  <table>
    <thead><tr><th>#</th><th>Platillo</th><th>Cantidad</th></tr></thead>
    <tbody>${topRows}</tbody>
  </table>` : ''}

  ${tablaAsistencia}

  <p class="footer">RestSys — Sistema de Gestión de Ventas e Inventario</p>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=720');
    if (!win) { setToast('Activa las ventanas emergentes del navegador para exportar PDF'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 450);
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', width: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '14px 18px' }}>

      {/* Barra de controles */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        background: 'var(--s)', padding: '10px 14px',
        borderRadius: 'var(--r)', boxShadow: 'var(--sh-xs)', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          PERÍODO:
        </span>
        <input type="date" className="inp" style={{ width: 148 }}
          value={fechas.desde} onChange={e => { setFechas(f => ({ ...f, desde: e.target.value })); setShortcut(null); }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>→</span>
        <input type="date" className="inp" style={{ width: 148 }}
          value={fechas.hasta} onChange={e => { setFechas(f => ({ ...f, hasta: e.target.value })); setShortcut(null); }} />

        {/* Atajos rápidos */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--s2)', padding: 3, borderRadius: 6, marginLeft: 2 }}>
          {shortcuts.map(([key, label, fn]) => (
            <button key={key} onClick={fn} style={{
              height: 27, padding: '0 10px', borderRadius: 4,
              border: shortcut === key ? '1.5px solid var(--navy)' : '1.5px solid transparent',
              background: shortcut === key ? 'var(--navy)' : 'transparent',
              color: shortcut === key ? 'white' : 'var(--text2)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .12s',
            }}>{label}</button>
          ))}
        </div>

        <button className="btn-primary" onClick={cargar} style={{ height: 34, fontSize: 11.5 }}>
          {cargando ? '⏳' : '↻ Actualizar'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button className="btn-sec" onClick={exportarCSV} style={{ height: 34, fontSize: 11.5 }}>
            ⬇ CSV
          </button>
          <button className="btn-sec" onClick={exportarPDF} style={{ height: 34, fontSize: 11.5 }}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* Chips de tipo cliente */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => setFiltroTipo(chip.key)}
            style={{
              height: 32, padding: '0 16px', borderRadius: 20,
              border: `1.5px solid ${filtroTipo === chip.key ? chip.border : 'var(--bd)'}`,
              background: filtroTipo === chip.key ? chip.bg : 'var(--s)',
              color: filtroTipo === chip.key ? chip.color : 'var(--text3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .12s',
              boxShadow: filtroTipo === chip.key ? 'var(--sh-xs)' : 'none',
            }}
          >{chip.label}</button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
          {ventasFiltradas.length} ventas activas
        </span>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>

        {/* Total período */}
        <div style={{ background: 'var(--navy)', borderRadius: 'var(--r)', padding: '14px 18px', boxShadow: 'var(--sh-xs)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Total del período
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0c840', fontFamily: 'var(--font-display)' }}>
            {formatPeso(totalPeriodo)}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
            {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'}
          </div>
        </div>

        {/* Total cobrado real (General) o Promedio (tipo específico) */}
        {filtroTipo === '' ? (
          <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: '14px 18px', boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
              💰 Total cobrado real
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
              {formatPeso(totalCobrado)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2 }}>Particular + Factura</div>
          </div>
        ) : (
          <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: '14px 18px', boxShadow: 'var(--sh-xs)', border: `1.5px solid ${chipActivo.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: chipActivo.color, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
              Promedio por venta
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
              {formatPeso(promedio)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2 }}>por transacción</div>
          </div>
        )}

        {/* Pensionados */}
        <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: '14px 18px', boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--c-pens)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            🏢 Pensionados
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
            {porTipo.PENSIONADO.count}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2 }}>servicios del período</div>
        </div>

        {/* Personal */}
        <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: '14px 18px', boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--c-pers)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            👥 Personal
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
            {porTipo.PERSONAL.count}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2 }}>consumos sin cobro</div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: dataBarras.length > 1 ? '2fr 1fr 1fr' : '1fr 1fr',
        gap: 12, marginBottom: 14,
      }}>

        {/* Barras por día */}
        {dataBarras.length > 1 && (
          <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Ventas por día
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dataBarras} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} width={44} />
                <Tooltip formatter={(v: any) => formatPeso(v)} />
                <Bar dataKey="total" fill="var(--navy)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Torta por tipo de cliente */}
        <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Por tipo de cliente
          </div>
          {dataTorta.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={dataTorta} cx="50%" cy="50%" outerRadius={62} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}>
                  {dataTorta.map((_, i) => <Cell key={i} fill={COLORES_TIPO[i % COLORES_TIPO.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} ventas`]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text3)', fontSize: 12 }}>Sin datos</div>
          )}
        </div>

        {/* Torta por método de pago */}
        <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Por método de pago
          </div>
          {dataPago.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={dataPago} cx="50%" cy="50%" outerRadius={62} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}>
                  {dataPago.map((_, i) => <Cell key={i} fill={COLORES_PAGO[i % COLORES_PAGO.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatPeso(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text3)', fontSize: 12 }}>Sin datos</div>
          )}
        </div>
      </div>

      {/* Top platillos */}
      {topProductos.length > 0 && (
        <div style={{ background: 'var(--s)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--sh-xs)', border: '1.5px solid var(--bd)', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Platillos más vendidos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topProductos.map(([nombre, cantidad], i) => {
              const pct = topProductos[0][1] > 0 ? (cantidad / topProductos[0][1]) * 100 : 0;
              return (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', width: 14, textAlign: 'right', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', width: 210, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nombre}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--navy)', borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', width: 58, textAlign: 'right', flexShrink: 0 }}>
                    {cantidad} uds.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!cargando && ventasFiltradas.length === 0 && ventas.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-ico">📊</div>
          <p>No hay ventas en este período</p>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default ReportesPage;
