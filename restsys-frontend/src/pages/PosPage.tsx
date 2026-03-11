import React, { useEffect, useState, useCallback } from 'react';
import { productosApi, ventasApi, pensionadosApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type {
  Producto, ItemCarrito, AgregadoCarrito, TipoCliente,
  MetodoPago, OrdenGarzon, Empleado,
} from '../types';
import { MENUS_CON_AGREGADOS } from '../types';
import { formatPeso } from '../utils/format';
import Toast from '../components/Toast';

// ── TIPOS DE CLIENTE CONFIG ───────────────────────────────────────────────────
const TIPOS: { id: TipoCliente; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'PENSIONADO',        label: 'Pensionado',  icon: '🏢', color: 'var(--c-pens)', bg: 'var(--c-pens-bg)' },
  { id: 'PARTICULAR',        label: 'Particular',  icon: '💳', color: 'var(--c-part)', bg: 'var(--c-part-bg)' },
  { id: 'PARTICULAR_FACTURA',label: 'Factura',     icon: '📄', color: 'var(--c-fact)', bg: 'var(--c-fact-bg)' },
  { id: 'PERSONAL',          label: 'Personal',    icon: '👤', color: 'var(--c-pers)', bg: 'var(--c-pers-bg)' },
];

const METODOS: { id: MetodoPago; label: string; icon: string }[] = [
  { id: 'EFECTIVO',      label: 'Efectivo',      icon: '💵' },
  { id: 'TARJETA',       label: 'Tarjeta',       icon: '💳' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '📲' },
];

// Factura solo acepta efectivo o transferencia (no tarjeta)
const METODOS_FACTURA: { id: MetodoPago; label: string; icon: string }[] = [
  { id: 'EFECTIVO',      label: 'Efectivo',      icon: '💵' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '📲' },
];

type TipoMenu = 'DESAYUNO' | 'ALMUERZO' | 'ALMUERZO_ESPECIAL' | 'CENA' | 'CENA_ESPECIAL' | 'COLACION' | 'COLACION_ESPECIAL' | 'COLACION_MEDIA_MANANA' | 'COLACION_FRIA' | 'BEBIDA' | 'OTRO';

const MENUS_DIA: { id: TipoMenu; label: string; icon: string }[] = [
  { id: 'DESAYUNO',              label: 'Desayuno',              icon: '☀️'  },
  { id: 'ALMUERZO',              label: 'Almuerzo',              icon: '🍽️' },
  { id: 'ALMUERZO_ESPECIAL',     label: 'Almuerzo especial',     icon: '⭐'  },
  { id: 'COLACION',              label: 'Colación',              icon: '🥡'  },
  { id: 'COLACION_ESPECIAL',     label: 'Colación especial',     icon: '🎁'  },
  { id: 'COLACION_MEDIA_MANANA', label: 'Colación media mañana', icon: '🌤️' },
  { id: 'COLACION_FRIA',         label: 'Colación fría',         icon: '🧊'  },
  { id: 'CENA',                  label: 'Cena',                  icon: '🌙'  },
  { id: 'CENA_ESPECIAL',         label: 'Cena especial',         icon: '✨'  },
  { id: 'BEBIDA',                label: 'Bebida',                icon: '🥤'  },
  { id: 'OTRO',                  label: 'Otro',                  icon: '📦'  },
];

// Retorna el menú activo ahora según horario (null = fuera de horario de comidas)
const getMenuActual = (): TipoMenu | null => {
  const h = new Date().getHours();
  if (h >= 6  && h < 9)  return 'DESAYUNO';
  if (h >= 12 && h < 15) return 'ALMUERZO';
  if (h >= 18 && h < 21) return 'CENA';
  return null;
};

const getMenuInicial = (): TipoMenu => getMenuActual() ?? 'COLACION';

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
const PosPage: React.FC = () => {
  const { ordenesGarzon, removerOrdenGarzon } = useApp();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [menuActivo, setMenuActivo] = useState<TipoMenu>(getMenuInicial());
  const [subcatActiva, setSubcatActiva] = useState<'ENTRADA' | 'FONDO' | 'POSTRE' | 'TODOS'>('TODOS');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // Campos del panel derecho
  const [tipoCliente, setTipoCliente] = useState<TipoCliente | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [mesa, setMesa] = useState('');
  const [rut, setRut] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [propina, setPropina] = useState('');
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [buscandoRut, setBuscandoRut] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [modalAgregados, setModalAgregados] = useState<{
    fondo: Producto;
    seleccionados: number[];
    editando: boolean;
    editandoIdx?: number;
  } | null>(null);

  // Cargar catálogo
  useEffect(() => {
    productosApi.getDisponibles().then(setProductos).catch(console.error);
  }, []);

  // Cargar orden del garzón seleccionada
  const cargarOrdenGarzon = (orden: OrdenGarzon) => {
    setNombreCliente(orden.nombreCliente);
    setMesa(orden.mesa);
    const items: ItemCarrito[] = orden.items.flatMap(item => {
      const prod = productos.find(p => p.id === item.productoId);
      if (!prod) return [];
      return [{
        productoId: prod.id,
        nombre: prod.nombre,
        emoji: prod.emoji,
        precio: Number(prod.precio),
        cantidad: item.cantidad,
        subtotal: Number(prod.precio) * item.cantidad,
      }];
    });
    setCarrito(items);
    removerOrdenGarzon(orden.mesa);
  };

  // Buscar empleado por RUT
  const buscarEmpleado = useCallback(async () => {
    if (!rut.trim()) return;
    setBuscandoRut(true);
    try {
      const emp = await pensionadosApi.buscarPorRut(rut.trim());
      setEmpleadoEncontrado(emp);
    } catch {
      setEmpleadoEncontrado(null);
    } finally {
      setBuscandoRut(false);
    }
  }, [rut]);

  // Carrito helpers
  const agregarAlCarrito = (prod: Producto) => {
    // FONDO en menú con agregados y hay disponibles → abrir modal (solo si no está ya en carrito)
    if (
      prod.subcategoria === 'FONDO' &&
      (MENUS_CON_AGREGADOS as readonly string[]).includes(prod.tipoMenu)
    ) {
      const hayAgregados = productos.some(
        p => p.subcategoria === 'AGREGADO' && p.disponible,
      );
      if (hayAgregados) {
        setModalAgregados({ fondo: prod, seleccionados: [], editando: false });
        return;
      }
    }
    // Comportamiento normal: agregar o incrementar
    setCarrito(prev => {
      const existe = prev.find(i => i.productoId === prod.id);
      if (existe) {
        const precioUnit = existe.precio + (existe.agregados?.reduce((s, a) => s + a.precio, 0) ?? 0);
        return prev.map(i => i.productoId === prod.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * precioUnit }
          : i,
        );
      }
      return [...prev, {
        productoId: prod.id,
        nombre: prod.nombre,
        emoji: prod.emoji,
        precio: Number(prod.precio),
        cantidad: 1,
        subtotal: Number(prod.precio),
      }];
    });
  };

  const abrirEditarAgregados = (item: ItemCarrito, idx: number) => {
    const prod = productos.find(p => p.id === item.productoId);
    if (!prod) return;
    setModalAgregados({
      fondo: prod,
      seleccionados: (item.agregados ?? []).map(a => a.productoId),
      editando: true,
      editandoIdx: idx,
    });
  };

  const confirmarAgregados = (overrideSeleccionados?: number[]) => {
    if (!modalAgregados) return;
    const { fondo, editando, editandoIdx } = modalAgregados;
    const seleccionados = overrideSeleccionados ?? modalAgregados.seleccionados;
    const agregadosProd = seleccionados
      .map(id => productos.find(p => p.id === id))
      .filter((p): p is Producto => !!p);
    const agregados: AgregadoCarrito[] = agregadosProd.map(a => ({
      productoId: a.id,
      nombre: a.nombre,
      emoji: a.emoji,
      precio: Number(a.precio),
    }));
    const agregadosTotal = agregados.reduce((s, a) => s + a.precio, 0);

    if (editando && editandoIdx !== undefined) {
      // Editar item existente en esa posición
      setCarrito(prev => prev.map((i, j) => {
        if (j !== editandoIdx) return i;
        return {
          ...i,
          subtotal: i.cantidad * (i.precio + agregadosTotal),
          agregados: agregados.length > 0 ? agregados : undefined,
        };
      }));
    } else {
      // Buscar si ya existe un item con los mismos agregados → incrementar; si no → nueva entrada
      const sortedNewIds = [...seleccionados].sort((a, b) => a - b);
      const existente = carrito.find(i => {
        if (i.productoId !== fondo.id) return false;
        const existingIds = (i.agregados ?? []).map(a => a.productoId).sort((a, b) => a - b);
        return JSON.stringify(existingIds) === JSON.stringify(sortedNewIds);
      });
      if (existente) {
        setCarrito(prev => prev.map(i =>
          i === existente
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * (i.precio + agregadosTotal) }
            : i,
        ));
      } else {
        setCarrito(prev => [...prev, {
          productoId: fondo.id,
          nombre: fondo.nombre,
          emoji: fondo.emoji,
          precio: Number(fondo.precio),
          cantidad: 1,
          subtotal: Number(fondo.precio) + agregadosTotal,
          agregados: agregados.length > 0 ? agregados : undefined,
        }]);
      }
    }
    setModalAgregados(null);
  };

  const cambiarCantidad = (idx: number, delta: number) => {
    setCarrito(prev => {
      return prev.map((i, j) => {
        if (j !== idx) return i;
        const nueva = i.cantidad + delta;
        if (nueva <= 0) return null as any;
        const precioUnit = i.precio + (i.agregados?.reduce((s, a) => s + a.precio, 0) ?? 0);
        return { ...i, cantidad: nueva, subtotal: nueva * precioUnit };
      }).filter(Boolean);
    });
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setTipoCliente(null);
    setMetodoPago(null);
    setNombreCliente('');
    setMesa('');
    setRut('');
    setMontoRecibido('');
    setPropina('');
    setEmpleadoEncontrado(null);
    setUltimaVenta(null);
    setModalAgregados(null);
  };

  const total = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const propinaNum = propina ? Number(propina) : 0;
  const vuelto = metodoPago === 'EFECTIVO' && montoRecibido
    ? Number(montoRecibido) - total - propinaNum
    : null;

  const puedeRegistrar = carrito.length > 0 && tipoCliente !== null && (
    (tipoCliente === 'PERSONAL' && nombreCliente.trim().length > 0) ||
    (tipoCliente === 'PENSIONADO' && !!empleadoEncontrado) ||
    (tipoCliente === 'PARTICULAR_FACTURA' && rut.trim().length > 0 && nombreCliente.trim().length > 0 && metodoPago !== null) ||
    (tipoCliente === 'PARTICULAR' && metodoPago !== null)
  );

  const procesarVenta = async () => {
    if (!puedeRegistrar) return;
    setProcesando(true);
    try {
      const venta = await ventasApi.create({
        tipoCliente: tipoCliente!,
        nombreCliente: nombreCliente || undefined,
        mesa: mesa || undefined,
        metodoPago: tipoCliente === 'PERSONAL' ? undefined : tipoCliente === 'PENSIONADO' ? 'CUENTA' : metodoPago!,
        rutFactura: tipoCliente === 'PARTICULAR_FACTURA' ? rut : undefined,
        empleadoId: empleadoEncontrado?.id,
        propina: propinaNum > 0 ? propinaNum : undefined,
        montoRecibido: montoRecibido ? Number(montoRecibido) : undefined,
        items: carrito.flatMap(i => [
          { productoId: i.productoId, cantidad: i.cantidad },
          ...(i.agregados ?? []).map(a => ({ productoId: a.productoId, cantidad: i.cantidad })),
        ]),
      });
      setUltimaVenta(venta);
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  };

  // ── Imprimir comanda ─────────────────────────────────────────────────────────

  const buildReceiptHtml = (orden: OrdenGarzon): string => {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es-CL');
    const LIN   = '─'.repeat(32);
    const itemsHtml = orden.items.map(item => {
      const prod = productos.find(p => p.id === item.productoId);
      if (!prod) return '';
      const nombre = prod.nombre.length > 26 ? prod.nombre.slice(0, 25) + '.' : prod.nombre;
      return `<tr><td class="qty">${item.cantidad}x</td><td>${nombre}</td></tr>`;
    }).join('');
    const clienteHtml = orden.nombreCliente && orden.nombreCliente !== `Mesa ${orden.mesa}`
      ? `<p><span class="lbl">Cliente:</span>  ${orden.nombreCliente}</p>` : '';
    const obsHtml = orden.observaciones
      ? `<div class="obs"><span class="lbl">OBS:</span>  ${orden.observaciones}</div>` : '';

    return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<title>Comanda · Mesa ${orden.mesa}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.6;
  padding:10px 8px;color:#000;background:#fff;max-width:80mm;margin:0 auto}
h1{text-align:center;font-size:20px;font-weight:900;margin-bottom:2px;letter-spacing:.05em}
.sub{text-align:center;font-size:11px;color:#444;margin-bottom:6px}
.lin{color:#000;margin:5px 0;letter-spacing:-.02em;white-space:pre}
p{margin:2px 0}.lbl{font-weight:700}
.center{text-align:center;font-weight:900;margin:4px 0}
table{width:100%;border-collapse:collapse}
td{padding:3px 0;vertical-align:top}
td.qty{width:28px;font-weight:800;white-space:nowrap}
.obs{font-style:italic;font-size:11px;padding:4px 6px;border:1px dashed #aaa;margin-top:4px}
@media print{@page{size:80mm auto;margin:0}body{padding:6px 4px}}
</style></head>
<body>
<h1>COMANDA</h1>
<p class="sub">${hora}  ·  ${fecha}</p>
<p class="lin">${LIN}</p>
<p><span class="lbl">Mesa:</span>  ${orden.mesa}</p>
<p><span class="lbl">Garzón:</span>  ${orden.garzon}</p>
${clienteHtml}
<p class="lin">${LIN}</p>
<p class="center">── PEDIDO ──</p>
<p class="lin">${LIN}</p>
<table>${itemsHtml}</table>
<p class="lin">${LIN}</p>
${obsHtml}
</body></html>`;
  };

  const abrirImpresionNavegador = (orden: OrdenGarzon): void => {
    const html = buildReceiptHtml(orden);
    const popup = window.open('', '_blank', 'width=420,height=600,scrollbars=yes,resizable=yes');
    if (!popup) { setToast('Activa las ventanas emergentes del navegador para imprimir.'); return; }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    // Pequeña espera para que el navegador renderice antes de mostrar el diálogo
    setTimeout(() => { popup.print(); }, 250);
  };

  const imprimirOrden = async (orden: OrdenGarzon) => {
    try {
      await fetch('/api/print/comanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa: orden.mesa,
          garzon: orden.garzon,
          nombreCliente: orden.nombreCliente,
          items: orden.items.flatMap(item => {
            const prod = productos.find(p => p.id === item.productoId);
            return prod ? [{ nombre: prod.nombre, cantidad: item.cantidad }] : [];
          }),
          observaciones: orden.observaciones,
        }),
      });
    } catch (e) {
      console.error('Error imprimiendo comanda:', e);
    }
  };

  const buildCartComandaHtml = (): string => {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es-CL');
    const LIN   = '─'.repeat(32);
    const itemsHtml = carrito.map(item => {
      const nombre = item.nombre.length > 26 ? item.nombre.slice(0, 25) + '.' : item.nombre;
      const agrHtml = (item.agregados ?? []).map(a => {
        const agNombre = a.nombre.length > 24 ? a.nombre.slice(0, 23) + '.' : a.nombre;
        return `<tr><td class="qty"> </td><td class="agr">↳ ${agNombre}</td></tr>`;
      }).join('');
      return `<tr><td class="qty">${item.cantidad}x</td><td>${nombre}</td></tr>${agrHtml}`;
    }).join('');
    const mesaHtml  = mesa         ? `<p><span class="lbl">Mesa:</span>  ${mesa}</p>` : '';
    const clienteHtml = nombreCliente ? `<p><span class="lbl">Cliente:</span>  ${nombreCliente}</p>` : '';
    return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<title>Comanda${mesa ? ' · Mesa ' + mesa : ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.6;
  padding:10px 8px;color:#000;background:#fff;max-width:80mm;margin:0 auto}
h1{text-align:center;font-size:20px;font-weight:900;margin-bottom:2px;letter-spacing:.05em}
.sub{text-align:center;font-size:11px;color:#444;margin-bottom:6px}
.lin{color:#000;margin:5px 0;letter-spacing:-.02em;white-space:pre}
p{margin:2px 0}.lbl{font-weight:700}
.center{text-align:center;font-weight:900;margin:4px 0}
table{width:100%;border-collapse:collapse}
td{padding:3px 0;vertical-align:top}
td.qty{width:28px;font-weight:800;white-space:nowrap}
td.agr{font-size:11px;color:#555;padding-left:6px}
@media print{@page{size:80mm auto;margin:0}body{padding:6px 4px}}
</style></head>
<body>
<h1>COMANDA</h1>
<p class="sub">${hora}  ·  ${fecha}</p>
<p class="lin">${LIN}</p>
${mesaHtml}${clienteHtml}
<p class="lin">${LIN}</p>
<p class="center">── PEDIDO ──</p>
<p class="lin">${LIN}</p>
<table>${itemsHtml}</table>
<p class="lin">${LIN}</p>
</body></html>`;
  };

  const imprimirCarrito = (): void => {
    if (carrito.length === 0) return;
    const html = buildCartComandaHtml();
    const popup = window.open('', '_blank', 'width=420,height=600,scrollbars=yes,resizable=yes');
    if (!popup) { setToast('Activa las ventanas emergentes del navegador para imprimir.'); return; }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => { popup.print(); }, 250);
  };

  const MENUS_CON_SUBCAT = ['ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL', 'DESAYUNO', 'BEBIDA'] as const;
  const esMenuConSubcat = (MENUS_CON_SUBCAT as readonly string[]).includes(menuActivo);

  const SUBCATS_ALMUERZO_CENA = [
    { id: 'ENTRADA' as const, label: 'Entrada',  icon: '🥗', color: '#1a5cb5' },
    { id: 'FONDO'   as const, label: 'Fondo',    icon: '🍽️', color: '#16784a' },
    { id: 'POSTRE'  as const, label: 'Postre',   icon: '🍮', color: '#9e5a00' },
  ];
  const SUBCATS_DESAYUNO_BEBIDA = [
    { id: 'CAFE_TE'         as const, label: 'Té / Café',            icon: '☕', color: '#7a4a1e' },
    { id: 'ACOMPANIAMIENTO' as const, label: 'Sándwich / Acompaño',  icon: '🥪', color: '#2e7d32' },
  ];
  const SUBCATS_POS = (['DESAYUNO', 'BEBIDA'] as string[]).includes(menuActivo)
    ? SUBCATS_DESAYUNO_BEBIDA
    : SUBCATS_ALMUERZO_CENA;

  const prodsPorMenu = productos.filter(p => p.tipoMenu === menuActivo && p.subcategoria !== 'AGREGADO');
  const prodsFiltrados = esMenuConSubcat && subcatActiva !== 'TODOS'
    ? prodsPorMenu.filter(p => p.subcategoria === subcatActiva)
    : prodsPorMenu;

  // Contar productos por subcategoría para mostrar badge en tabs
  const contarSubcat = (sc: string) => prodsPorMenu.filter(p => p.subcategoria === sc).length;

  const renderTarjetaProducto = (prod: Producto) => {
    const enCarrito = carrito.find(i => i.productoId === prod.id);
    return (
      <div
        key={prod.id}
        onClick={() => agregarAlCarrito(prod)}
        style={{
          width: 120, height: 96, flexShrink: 0,
          background: enCarrito ? 'var(--green-bg)' : 'var(--s)',
          border: `1.5px solid ${enCarrito ? 'var(--green)' : 'var(--bd)'}`,
          borderRadius: 'var(--r-sm)',
          cursor: 'pointer', transition: 'all .12s',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          if (!enCarrito) {
            e.currentTarget.style.borderColor = 'var(--gold-bd)';
            e.currentTarget.style.boxShadow = 'var(--sh-xs)';
          }
        }}
        onMouseLeave={e => {
          if (!enCarrito) {
            e.currentTarget.style.borderColor = 'var(--bd)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 2, padding: '6px 8px 4px',
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{prod.emoji || '🍽️'}</span>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text)',
            textAlign: 'center', width: '100%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{prod.nombre}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--navy)' }}>
            {formatPeso(prod.precio)}
          </div>
        </div>
        {enCarrito && (
          <div
            style={{
              height: 26, flexShrink: 0,
              display: 'flex', alignItems: 'center',
              borderTop: '1.5px solid rgba(22,120,74,.25)',
              background: 'rgba(22,120,74,.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => cambiarCantidad(prod.id, -1)}
              style={{
                flex: 1, height: '100%', border: 'none',
                background: 'transparent', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', color: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'var(--green)',
              minWidth: 22, textAlign: 'center',
              borderLeft: '1px solid rgba(22,120,74,.2)',
              borderRight: '1px solid rgba(22,120,74,.2)',
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{enCarrito.cantidad}</span>
            <button
              onClick={() => cambiarCantidad(prod.id, 1)}
              style={{
                flex: 1, height: '100%', border: 'none',
                background: 'transparent', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', color: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── COL 1: Órdenes pendientes del garzón ── */}
      <aside style={{
        width: 270, background: 'var(--s2)',
        borderRight: '1.5px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '10px 13px', borderBottom: '1.5px solid var(--bd)',
          background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'white', flex: 1 }}>
            📲 Órdenes garzón
          </span>
          {ordenesGarzon.length > 0 && (
            <span style={{
              background: 'var(--red)', color: 'white',
              fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
            }}>{ordenesGarzon.length}</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 7 }}>
          {ordenesGarzon.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 10px' }}>
              <div className="empty-state-ico">📭</div>
              <p>Sin órdenes pendientes</p>
            </div>
          ) : (
            ordenesGarzon.map((orden, i) => (
              <div key={i} style={{
                background: 'var(--s)', border: '1.5px solid var(--bd)',
                borderRadius: 'var(--r-sm)', padding: '10px 11px',
                marginBottom: 7, cursor: 'pointer',
                borderLeft: '3px solid var(--red)',
                transition: 'all .13s',
              }}
                onClick={() => cargarOrdenGarzon(orden)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-bd)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    background: 'var(--navy)', color: '#f0c840',
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                  }}>Mesa {orden.mesa}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{orden.nombreCliente}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
                  {orden.items.length} ítems · Garzón: {orden.garzon}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button style={{
                    flex: 1, height: 28, background: 'var(--navy)', color: 'white',
                    borderRadius: 4, fontSize: 10.5, fontWeight: 800, border: 'none', cursor: 'pointer',
                  }}>Cargar orden →</button>
                  <button
                    onClick={e => { e.stopPropagation(); abrirImpresionNavegador(orden); }}
                    title="Imprimir comanda"
                    style={{
                      width: 28, height: 28, background: 'var(--s2)', color: 'var(--text2)',
                      borderRadius: 4, fontSize: 13, fontWeight: 800,
                      border: '1.5px solid var(--bd)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >🖨️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Nueva venta manual */}
        <button
          onClick={limpiarVenta}
          style={{
            margin: '6px 7px', height: 34,
            background: 'var(--s)', border: '1.5px dashed var(--bd2)',
            borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 700,
            color: 'var(--text2)', transition: 'all .13s', cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--gold-bg)';
            e.currentTarget.style.borderColor = 'var(--gold-bd)';
            e.currentTarget.style.color = 'var(--gold)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--s)';
            e.currentTarget.style.borderColor = 'var(--bd2)';
            e.currentTarget.style.color = 'var(--text2)';
          }}
        >+ Nueva venta manual</button>
      </aside>

      {/* ── COL 2: Menú + carrito ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'var(--bg)',
      }}>
        {/* Header con info de mesa/cliente actual */}
        <div style={{
          padding: '7px 14px', flexShrink: 0, display: 'flex',
          alignItems: 'center', gap: 10, borderBottom: '1.5px solid var(--bd)',
          background: 'var(--s)',
        }}>
          {mesa ? (
            <span style={{
              background: 'var(--navy)', color: '#f0c840',
              fontSize: 12.5, fontWeight: 800, padding: '3px 11px', borderRadius: 5,
            }}>Mesa {mesa}</span>
          ) : (
            <input
              className="inp"
              style={{ width: 80, fontSize: 12 }}
              placeholder="Mesa"
              value={mesa}
              onChange={e => setMesa(e.target.value)}
            />
          )}
          <input
            className="inp"
            style={{ flex: 1 }}
            placeholder="Nombre del cliente (opcional)"
            value={nombreCliente}
            onChange={e => setNombreCliente(e.target.value)}
          />
        </div>

        {/* Zona menú */}
        <div style={{
          flex: '0 0 52%', display: 'flex', flexDirection: 'column',
          borderBottom: '2px solid var(--bd)', background: 'var(--s2)', overflow: 'hidden',
        }}>
          {/* Menú del día */}
          <div style={{
            display: 'flex', gap: 5, padding: '6px 13px',
            flexShrink: 0, overflowX: 'auto', alignItems: 'center',
          }}>
            {MENUS_DIA.map(menu => {
              const esAhora = menu.id === getMenuActual();
              const activo  = menuActivo === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => { setMenuActivo(menu.id); setSubcatActiva('TODOS'); }}
                  style={{
                    height: 28, padding: '0 10px', borderRadius: 5,
                    border: `1.5px solid ${activo ? 'var(--navy)' : 'var(--bd2)'}`,
                    background: activo ? 'var(--navy)' : 'var(--s)',
                    color: activo ? 'white' : 'var(--text2)',
                    fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
                    cursor: 'pointer', transition: 'all .11s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span>{menu.icon}</span>
                  {menu.label}
                  {esAhora && (
                    <span style={{
                      fontSize: 8, fontWeight: 900,
                      background: activo ? 'rgba(255,255,255,.25)' : 'var(--green)',
                      color: 'white', padding: '2px 5px', borderRadius: 3,
                      textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>Ahora</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tabs de subcategoría (solo para menús compatibles) */}
          {esMenuConSubcat && (
            <div style={{
              display: 'flex', gap: 0, flexShrink: 0,
              borderBottom: '2px solid var(--bd)', background: 'var(--s)',
            }}>
              {/* Tab "Todos" */}
              <button
                onClick={() => setSubcatActiva('TODOS')}
                style={{
                  flex: 1, height: 36, border: 'none', borderBottom: subcatActiva === 'TODOS' ? '2px solid var(--navy)' : '2px solid transparent',
                  background: subcatActiva === 'TODOS' ? 'var(--s2)' : 'transparent',
                  color: subcatActiva === 'TODOS' ? 'var(--navy)' : 'var(--text3)',
                  fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  transition: 'all .12s', marginBottom: -2,
                }}
              >
                🗂️ Todos
                <span style={{
                  fontSize: 9, fontWeight: 900,
                  background: subcatActiva === 'TODOS' ? 'var(--navy)' : 'var(--bd2)',
                  color: subcatActiva === 'TODOS' ? 'white' : 'var(--text3)',
                  padding: '1px 5px', borderRadius: 3,
                }}>{prodsPorMenu.length}</span>
              </button>

              {SUBCATS_POS.map(sc => {
                const count = contarSubcat(sc.id);
                const activa = subcatActiva === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSubcatActiva(sc.id)}
                    style={{
                      flex: 1, height: 36, border: 'none',
                      borderBottom: activa ? `2px solid ${sc.color}` : '2px solid transparent',
                      background: activa ? sc.color + '18' : 'transparent',
                      color: activa ? sc.color : 'var(--text3)',
                      fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      transition: 'all .12s', marginBottom: -2,
                    }}
                  >
                    <span>{sc.icon}</span>
                    {sc.label}
                    {count > 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 900,
                        background: activa ? sc.color : 'var(--bd2)',
                        color: activa ? 'white' : 'var(--text3)',
                        padding: '1px 5px', borderRadius: 3,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Grid de productos */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: 6, padding: '6px 13px 10px', overflowY: 'auto', flex: 1,
            alignContent: 'flex-start',
          }}>
            {prodsFiltrados.length === 0 ? (
              <div className="empty-state" style={{ width: '100%', padding: '32px 0' }}>
                <div className="empty-state-ico">🍽️</div>
                <p>Sin productos en esta subcategoría</p>
              </div>
            ) : prodsFiltrados.map(prod => renderTarjetaProducto(prod))}
          </div>
        </div>

        {/* Carrito */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '5px 13px', background: 'var(--s)',
            borderBottom: '1.5px solid var(--bd)', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.09em', flex: 1 }}>
              PEDIDO ACTUAL
            </span>
            {carrito.length > 0 && (<>
              <span style={{
                background: 'var(--navy)', color: 'white',
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
              }}>{carrito.reduce((a, i) => a + i.cantidad, 0)} ítems</span>
              <button
                onClick={imprimirCarrito}
                title="Imprimir comanda"
                style={{
                  width: 24, height: 24, background: 'var(--s2)', border: '1.5px solid var(--bd)',
                  borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >🖨️</button>
            </>)}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '5px 13px' }}>
            {carrito.length === 0 ? (
              <div className="empty-state" style={{ padding: '14px 0' }}>
                <div className="empty-state-ico" style={{ fontSize: 22 }}>🛒</div>
                <p>Selecciona productos del menú</p>
              </div>
            ) : (
              carrito.map((item, idx) => {
                const esFondoEditable = (() => {
                  const prod = productos.find(p => p.id === item.productoId);
                  return prod?.subcategoria === 'FONDO' &&
                    (MENUS_CON_AGREGADOS as readonly string[]).includes(prod.tipoMenu) &&
                    productos.some(p => p.subcategoria === 'AGREGADO' && p.disponible);
                })();
                return (
                  <React.Fragment key={idx}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 0', borderBottom: item.agregados?.length ? 'none' : '1px solid #f0f3f8',
                    }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.emoji || '🍽️'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700 }}>{item.nombre}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                            {formatPeso(item.precio + (item.agregados?.reduce((s, a) => s + a.precio, 0) ?? 0))} c/u
                          </span>
                          {esFondoEditable && (
                            <button
                              onClick={() => abrirEditarAgregados(item, idx)}
                              title="Editar extras"
                              style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                background: item.agregados?.length ? 'var(--green-bg)' : 'var(--s2)',
                                color: item.agregados?.length ? 'var(--green)' : 'var(--text3)',
                                border: `1px solid ${item.agregados?.length ? '#8ed4b0' : 'var(--bd)'}`,
                                cursor: 'pointer',
                              }}
                            >{item.agregados?.length ? `+${item.agregados.length} extra` : '+ extras'}</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <button onClick={() => cambiarCantidad(idx, -1)} style={{
                          width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--bd)',
                          background: 'var(--s)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>−</button>
                        <span style={{ fontSize: 12, fontWeight: 800, width: 15, textAlign: 'center' }}>
                          {item.cantidad}
                        </span>
                        <button onClick={() => cambiarCantidad(idx, 1)} style={{
                          width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--bd)',
                          background: 'var(--s)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>+</button>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', minWidth: 60, textAlign: 'right' }}>
                        {formatPeso(item.subtotal)}
                      </span>
                    </div>

                    {/* Agregados del fondo */}
                    {item.agregados && item.agregados.length > 0 && (
                      <div style={{
                        marginLeft: 22, paddingBottom: 4, borderBottom: '1px solid #f0f3f8',
                      }}>
                        {item.agregados.map(agr => (
                          <div key={agr.productoId} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 10, color: 'var(--text2)', padding: '1px 0',
                          }}>
                            <span style={{ color: 'var(--green)', fontWeight: 700 }}>↳</span>
                            <span>{agr.emoji ? `${agr.emoji} ` : ''}{agr.nombre}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: agr.precio > 0 ? 'var(--text3)' : 'var(--green)', fontWeight: 600 }}>
                              {agr.precio > 0 ? `+${formatPeso(agr.precio)}` : 'incluido'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── COL 3: Panel de pago ── */}
      <aside style={{
        width: 298, background: 'var(--s)',
        borderLeft: '1.5px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
      }}>

        {/* Modal éxito */}
        {ultimaVenta && (
          <div style={{ padding: 16 }}>
            <div style={{
              background: 'var(--green-bg)', border: '1.5px solid #8ed4b0',
              borderRadius: 'var(--r)', padding: 14, textAlign: 'center',
              animation: 'slideIn .2s ease',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                ¡Venta registrada!
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                #{ultimaVenta.id} · {formatPeso(ultimaVenta.total)}
              </div>
              {ultimaVenta.propina > 0 && (
                <div style={{
                  marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--c-part)',
                  background: 'var(--c-part-bg)', padding: '4px 10px', borderRadius: 5,
                }}>
                  Propina: {formatPeso(ultimaVenta.propina)}
                </div>
              )}
              {ultimaVenta.vuelto > 0 && (
                <div style={{
                  marginTop: 6, fontSize: 14, fontWeight: 800, color: 'var(--navy)',
                  background: 'var(--gold-bg)', padding: '6px 12px', borderRadius: 6,
                }}>
                  Vuelto: {formatPeso(ultimaVenta.vuelto)}
                </div>
              )}
              <button
                onClick={limpiarVenta}
                style={{
                  marginTop: 10, width: '100%', height: 36, background: 'var(--navy)',
                  color: 'white', border: 'none', borderRadius: 6, fontWeight: 700,
                  fontSize: 12, cursor: 'pointer',
                }}
              >Nueva venta</button>
            </div>
          </div>
        )}

        {!ultimaVenta && (<>
          {/* Tipo de cliente */}
          <div style={{ padding: '10px 13px', borderBottom: '1.5px solid var(--bd)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 7 }}>
              TIPO DE CLIENTE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTipoCliente(t.id); setMetodoPago(null); setEmpleadoEncontrado(null); setRut(''); setNombreCliente(''); }}
                  style={{
                    height: 46, borderRadius: 'var(--r-sm)',
                    border: `1.5px solid ${tipoCliente === t.id ? t.color : 'var(--bd)'}`,
                    background: tipoCliente === t.id ? t.bg : 'var(--s2)',
                    color: tipoCliente === t.id ? t.color : 'var(--text2)',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 2, transition: 'all .13s',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel contextual según tipo de cliente */}
          {tipoCliente === 'PENSIONADO' && (
            <div style={{ padding: '8px 13px', borderBottom: '1.5px solid var(--bd)' }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, padding: '7px 9px', borderRadius: 6,
                background: 'var(--c-pens-bg)', color: 'var(--c-pens)', marginBottom: 7,
              }}>Ingresa el RUT del empleado para identificar su empresa</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="inp"
                  placeholder="RUT ej: 15.678.901-2"
                  value={rut}
                  onChange={e => setRut(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarEmpleado()}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={buscarEmpleado}
                  disabled={buscandoRut}
                  className="btn-primary"
                  style={{ height: 36, padding: '0 10px', fontSize: 11 }}
                >🔍</button>
              </div>
              {empleadoEncontrado && (
                <div style={{
                  marginTop: 6, background: 'var(--c-pens-bg)',
                  border: '1px solid rgba(90,56,160,.3)',
                  borderRadius: 'var(--r-sm)', padding: '7px 9px',
                  display: 'flex', alignItems: 'center', gap: 7,
                  animation: 'slideIn .15s ease',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--c-pens)', color: 'white',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{empleadoEncontrado.nombre.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-pens)' }}>
                      {empleadoEncontrado.nombre}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                      {empleadoEncontrado.empresa?.nombre}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>✓ Verificado</div>
                  </div>
                </div>
              )}
              <input
                className="inp"
                type="number"
                min="0"
                placeholder="💰 Propina (opcional)"
                value={propina}
                onChange={e => setPropina(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
          )}

          {tipoCliente === 'PARTICULAR_FACTURA' && (
            <div style={{ padding: '8px 13px', borderBottom: '1.5px solid var(--bd)' }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, padding: '7px 9px', borderRadius: 6,
                background: 'var(--c-fact-bg)', color: 'var(--c-fact)', marginBottom: 7,
              }}>Factura — solo efectivo o transferencia</div>
              <input
                className="inp"
                placeholder="Razón social / Nombre *"
                value={nombreCliente}
                onChange={e => setNombreCliente(e.target.value)}
                style={{ marginBottom: 6 }}
              />
              <input
                className="inp"
                placeholder="RUT ej: 76.543.210-K *"
                value={rut}
                onChange={e => setRut(e.target.value)}
              />
            </div>
          )}

          {/* Sección PERSONAL: nombre obligatorio */}
          {tipoCliente === 'PERSONAL' && (
            <div style={{ padding: '8px 13px', borderBottom: '1.5px solid var(--bd)' }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, padding: '7px 9px', borderRadius: 6,
                background: 'var(--c-pers-bg)', color: 'var(--c-pers)', marginBottom: 7,
              }}>Consumo sin cobro — ingresa el nombre del personal</div>
              <input
                className="inp"
                placeholder="Nombre del personal *"
                value={nombreCliente}
                onChange={e => setNombreCliente(e.target.value)}
              />
            </div>
          )}

          {/* Método de pago (particulares y factura) */}
          {(tipoCliente === 'PARTICULAR' || tipoCliente === 'PARTICULAR_FACTURA') && (
            <div style={{ padding: '8px 13px', borderBottom: '1.5px solid var(--bd)' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                FORMA DE PAGO
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(tipoCliente === 'PARTICULAR_FACTURA' ? METODOS_FACTURA : METODOS).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    style={{
                      flex: 1, height: 42, borderRadius: 'var(--r-sm)',
                      border: `1.5px solid ${metodoPago === m.id ? 'var(--gold-bd)' : 'var(--bd)'}`,
                      background: metodoPago === m.id ? 'var(--gold-bg)' : 'var(--s2)',
                      color: metodoPago === m.id ? 'var(--gold)' : 'var(--text3)',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 2, transition: 'all .12s',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              {metodoPago === 'EFECTIVO' && (
                <input
                  className="inp"
                  type="number"
                  placeholder="Monto recibido"
                  value={montoRecibido}
                  onChange={e => setMontoRecibido(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
              {metodoPago && (
                <input
                  className="inp"
                  type="number"
                  min="0"
                  placeholder="💰 Propina (opcional)"
                  value={propina}
                  onChange={e => setPropina(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          )}

          {/* Total */}
          <div style={{ padding: '10px 13px', flexShrink: 0, borderBottom: '1.5px solid var(--bd)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Total</span>
              {tipoCliente === 'PERSONAL' ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--c-pers)',
                  background: 'var(--c-pers-bg)', padding: '3px 9px', borderRadius: 5,
                }}>Sin cobro</span>
              ) : tipoCliente === 'PENSIONADO' ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--c-pens)',
                  background: 'var(--c-pens-bg)', padding: '3px 9px', borderRadius: 5,
                }}>A cuenta</span>
              ) : (
                <span style={{
                  fontSize: 23, fontWeight: 800, color: 'var(--navy)',
                  fontFamily: 'var(--font-display)',
                }}>{formatPeso(total)}</span>
              )}
            </div>
            {vuelto !== null && vuelto >= 0 && (
              <div style={{
                marginTop: 6, fontSize: 12, fontWeight: 700,
                color: 'var(--green)', background: 'var(--green-bg)',
                padding: '4px 10px', borderRadius: 5, textAlign: 'center',
              }}>
                Vuelto: {formatPeso(vuelto)}
              </div>
            )}
            {vuelto !== null && vuelto < 0 && (
              <div style={{
                marginTop: 6, fontSize: 11, fontWeight: 700,
                color: 'var(--red)', background: 'var(--red-bg)',
                padding: '4px 10px', borderRadius: 5, textAlign: 'center',
              }}>
                Monto insuficiente
              </div>
            )}
          </div>

          {/* Botón de acción */}
          <div style={{ padding: '10px 13px' }}>
            <button
              onClick={procesarVenta}
              disabled={!puedeRegistrar || procesando || (vuelto !== null && vuelto < 0)}
              style={{
                width: '100%', height: 42, border: 'none', borderRadius: 'var(--r-sm)',
                fontSize: 13.5, fontWeight: 800, cursor: puedeRegistrar ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: puedeRegistrar && !procesando ? 1 : 0.35,
                background: tipoCliente === 'PENSIONADO' ? 'var(--c-pens)'
                  : tipoCliente === 'PERSONAL' ? 'var(--c-pers)'
                  : 'var(--navy)',
                color: 'white',
                transition: 'all .13s',
              }}
            >
              {procesando ? '⏳ Procesando...'
                : tipoCliente === 'PENSIONADO' ? '📋 Registrar a cuenta'
                : tipoCliente === 'PERSONAL' ? '👤 Registrar consumo'
                : '✓ Cobrar'}
            </button>
          </div>
        </>)}
      </aside>

      {/* ── MODAL SELECCIÓN DE AGREGADOS ── */}
      {modalAgregados && (() => {
        const disponibles = productos.filter(
          p => p.subcategoria === 'AGREGADO' && p.disponible,
        );
        const toggle = (id: number) => setModalAgregados(prev => prev ? ({
          ...prev,
          seleccionados: prev.seleccionados.includes(id)
            ? prev.seleccionados.filter(x => x !== id)
            : [...prev.seleccionados, id],
        }) : null);
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }} onClick={() => setModalAgregados(null)}>
            <div style={{
              background: 'var(--s)', borderRadius: 'var(--r)',
              padding: '22px 24px', width: 340, maxWidth: '92vw',
              boxShadow: '0 8px 40px rgba(0,0,0,.25)', border: '1.5px solid var(--bd)',
              animation: 'slideIn .15s ease',
            }} onClick={e => e.stopPropagation()}>

              {/* Título */}
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
                🍽️ {modalAgregados.fondo.nombre}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
                Selecciona los agregados para este fondo
              </div>

              {/* Lista de agregados */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                {disponibles.map(agr => {
                  const sel = modalAgregados.seleccionados.includes(agr.id);
                  return (
                    <button
                      key={agr.id}
                      onClick={() => toggle(agr.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        border: `1.5px solid ${sel ? 'var(--green)' : 'var(--bd)'}`,
                        background: sel ? 'var(--green-bg)' : 'var(--s2)',
                        cursor: 'pointer', transition: 'all .1s', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        background: sel ? 'var(--green)' : 'var(--bd)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'white', fontWeight: 800,
                      }}>{sel ? '✓' : ''}</span>
                      <span style={{ fontSize: 13 }}>{agr.emoji || '🧂'}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {agr.nombre}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
                        {agr.precio > 0 ? `+${formatPeso(agr.precio)}` : 'incluido'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => confirmarAgregados([])}
                  style={{
                    flex: 1, height: 38, border: '1.5px solid var(--bd)',
                    borderRadius: 'var(--r-sm)', background: 'var(--bg)',
                    fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer',
                  }}
                >Sin extras</button>
                <button
                  onClick={() => confirmarAgregados()}
                  style={{
                    flex: 2, height: 38, border: 'none',
                    borderRadius: 'var(--r-sm)', background: 'var(--navy)',
                    fontSize: 12.5, fontWeight: 800, color: 'white', cursor: 'pointer',
                  }}
                >
                  {modalAgregados.editando ? 'Actualizar' : 'Agregar al pedido'}
                  {modalAgregados.seleccionados.length > 0 && ` (${modalAgregados.seleccionados.length})`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default PosPage;
