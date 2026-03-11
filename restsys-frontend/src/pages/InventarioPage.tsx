import React, { useEffect, useState, useMemo } from 'react';
import { productosApi } from '../services/api';
import type { Producto, SubcategoriaMenu } from '../types';
import { TIPOS_CON_SUBCAT } from '../types';
import { formatPeso } from '../utils/format';
import Toast from '../components/Toast';

const EMOJIS_RESTAURANTE = [
  // Desayuno
  '🥐','🍳','🥞','🧇','🥓','☕','🍵','🥛','🧃','🍞',
  // Almuerzo / Cena
  '🍽️','🍲','🥘','🍜','🍝','🥗','🍱','🫕','🥩','🍗',
  '🍖','🌮','🥪','🫔','🥫','🧆','🥙','🍛','🫛',
  // Colación / Snacks
  '🥡','🥟','🧀','🥚','🌯','🥨','🫓','🍿',
  // Postres
  '🍮','🍰','🎂','🍩','🍪','🍫','🍮','🧁','🍦','🍧',
  // Bebidas
  '🥤','🧋','🍺','🍻','🧉','🍷','🍸','🍹','💧','🫗',
  // Frutas / Verduras
  '🍅','🥑','🫑','🥦','🌽','🍋','🍊','🍇','🍓','🫐',
  // Sopas / caldos
  '🍜','🥣','🫙',
] as const;

const SUBCATS: { id: SubcategoriaMenu; label: string; color: string }[] = [
  { id: 'ENTRADA',  label: 'Entrada',  color: '#1a5cb5' },
  { id: 'FONDO',    label: 'Fondo',    color: '#16784a' },
  { id: 'POSTRE',   label: 'Postre',   color: '#9e5a00' },
  { id: 'AGREGADO', label: 'Agregado', color: '#c0351a' },
];
const MENUS_CON_AGREGADOS_INV = ['ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL'];

const SECCIONES = [
  { id: 'DESAYUNO',              label: 'Desayuno',              icon: '☀️'  },
  { id: 'ALMUERZO',              label: 'Almuerzo',              icon: '🍽️' },
  { id: 'ALMUERZO_ESPECIAL',     label: 'Almuerzo especial',     icon: '⭐'  },
  { id: 'CENA',                  label: 'Cena',                  icon: '🌙'  },
  { id: 'CENA_ESPECIAL',         label: 'Cena especial',         icon: '✨'  },
  { id: 'COLACION',              label: 'Colación',              icon: '🥡'  },
  { id: 'COLACION_ESPECIAL',     label: 'Colación especial',     icon: '🎁'  },
  { id: 'COLACION_MEDIA_MANANA', label: 'Colación media mañana', icon: '🌤️' },
  { id: 'COLACION_FRIA',         label: 'Colación fría',         icon: '🧊'  },
  { id: 'BEBIDA',                label: 'Bebida',                icon: '🥤'  },
  { id: 'OTRO',                  label: 'Otro',                  icon: '📦'  },
] as const;

type TipoMenu = typeof SECCIONES[number]['id'];

const FORM_VACIO = {
  nombre: '',
  precio: '',
  emoji: '',
  tipoMenu: 'ALMUERZO' as TipoMenu,
  subcategoria: '' as SubcategoriaMenu | '',
  descripcion: '',
  disponible: true,
};

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button
    onClick={onChange}
    title={on ? 'Disponible — click para desactivar' : 'No disponible — click para activar'}
    style={{
      width: 36, height: 20, borderRadius: 10, flexShrink: 0,
      background: on ? 'var(--green)' : 'var(--bd2)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background .2s',
    }}
  >
    <span style={{
      position: 'absolute', top: 2,
      left: on ? 18 : 2,
      width: 16, height: 16, borderRadius: '50%',
      background: 'white', transition: 'left .2s',
      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
    }} />
  </button>
);

// ── Componente principal ──────────────────────────────────────────────────────
const InventarioPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [seccionActiva, setSeccionActiva] = useState<TipoMenu | 'TODAS'>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modal, setModal] = useState<'crear' | 'editar' | 'confirmarEliminar' | null>(null);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);
  const [errModal, setErrModal] = useState('');
  const [mostrarEmojis, setMostrarEmojis] = useState(false);
  const [toast, setToast] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const prods = await productosApi.getAll();
      setProductos(prods);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const prodsFiltrados = useMemo(() => {
    let lista = productos;
    if (seccionActiva !== 'TODAS') lista = lista.filter(p => p.tipoMenu === seccionActiva);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [productos, seccionActiva, busqueda]);

  const porSeccion = useMemo(() => {
    const ids = seccionActiva === 'TODAS'
      ? SECCIONES.map(s => s.id)
      : [seccionActiva];
    return ids
      .map(id => ({
        ...SECCIONES.find(s => s.id === id)!,
        productos: prodsFiltrados.filter(p => p.tipoMenu === id),
      }))
      .filter(s => s.productos.length > 0);
  }, [prodsFiltrados, seccionActiva]);

  const toggleDisponible = async (prod: Producto) => {
    try {
      const actualizado = await productosApi.toggleDisponibilidad(prod.id);
      setProductos(prev => prev.map(p => p.id === prod.id ? actualizado : p));
    } catch { setToast('Error al cambiar disponibilidad'); }
  };

  const abrirCrear = () => {
    setForm({ ...FORM_VACIO });
    setProductoEditando(null);
    setErrModal('');
    setMostrarEmojis(false);
    setModal('crear');
  };

  const abrirEditar = (prod: Producto) => {
    setForm({
      nombre: prod.nombre,
      precio: String(prod.precio),
      emoji: prod.emoji || '',
      tipoMenu: prod.tipoMenu as TipoMenu,
      subcategoria: (prod.subcategoria as SubcategoriaMenu | '') || '',
      descripcion: prod.descripcion || '',
      disponible: prod.disponible,
    });
    setProductoEditando(prod);
    setErrModal('');
    setModal('editar');
  };

  const guardarProducto = async () => {
    const esAgregado = form.subcategoria === 'AGREGADO';
    if (!form.nombre.trim() || (!esAgregado && !form.precio)) {
      setErrModal('Nombre y precio son obligatorios');
      return;
    }
    setGuardando(true);
    setErrModal('');
    try {
      const tieneSubcat = (TIPOS_CON_SUBCAT as readonly string[]).includes(form.tipoMenu);
      const data = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio),
        emoji: form.emoji.trim() || undefined,
        tipoMenu: form.tipoMenu,
        subcategoria: tieneSubcat && form.subcategoria ? form.subcategoria : null,
        descripcion: form.descripcion.trim() || undefined,
        disponible: form.disponible,
      };
      if (modal === 'crear') {
        const nuevo = await productosApi.create(data);
        setProductos(prev => [...prev, nuevo]);
      } else if (productoEditando) {
        const actualizado = await productosApi.update(productoEditando.id, data);
        setProductos(prev => prev.map(p => p.id === productoEditando.id ? actualizado : p));
      }
      setModal(null);
    } catch (e: any) {
      setErrModal(e?.response?.data?.message || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const abrirEliminar = (prod: Producto) => {
    setProductoEditando(prod);
    setModal('confirmarEliminar');
  };

  const confirmarEliminar = async () => {
    if (!productoEditando) return;
    setGuardando(true);
    try {
      await productosApi.delete(productoEditando.id);
      setProductos(prev => prev.filter(p => p.id !== productoEditando.id));
      setToast(`"${productoEditando.nombre}" eliminado`);
      setModal(null);
    } catch {
      setToast('Error al eliminar el platillo');
    } finally { setGuardando(false); }
  };

  const contarSeccion = (id: string) => productos.filter(p => p.tipoMenu === id).length;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 200, background: 'var(--s2)', borderRight: '1.5px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '10px 13px', borderBottom: '1.5px solid var(--bd)', background: 'var(--navy)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'white' }}>🍳 Platillos</span>
        </div>

        <div style={{ padding: '7px 7px 0', overflow: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', padding: '4px 5px 6px' }}>
            MENÚ DEL DÍA
          </div>

          {([{ id: 'TODAS' as const, label: 'Todos', icon: '🗂️', count: productos.length }, ...SECCIONES.map(s => ({ ...s, count: contarSeccion(s.id) }))]).map(sec => (
            <button
              key={sec.id}
              onClick={() => setSeccionActiva(sec.id)}
              style={{
                width: '100%', height: 32, display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 9px', borderRadius: 'var(--r-xs)', marginBottom: 2,
                background: seccionActiva === sec.id ? 'var(--navy)' : 'transparent',
                color: seccionActiva === sec.id ? 'white' : 'var(--text2)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                transition: 'all .12s',
              }}
            >
              <span>{sec.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{sec.label}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 800,
                background: seccionActiva === sec.id ? 'rgba(255,255,255,.2)' : 'var(--bd)',
                color: seccionActiva === sec.id ? 'white' : 'var(--text3)',
                padding: '1px 6px', borderRadius: 3,
              }}>{sec.count}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Barra superior */}
        <div style={{
          padding: '10px 18px', background: 'var(--s)',
          borderBottom: '1.5px solid var(--bd)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <input
            className="inp"
            style={{ flex: 1, maxWidth: 340 }}
            placeholder="🔍 Buscar platillo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
            {prodsFiltrados.length} platillo{prodsFiltrados.length !== 1 ? 's' : ''}
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn-primary" onClick={abrirCrear} style={{ height: 36, fontSize: 12 }}>
              + Nuevo platillo
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {cargando ? (
            <div className="empty-state"><p>Cargando platillos...</p></div>
          ) : prodsFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-ico">🍽️</div>
              <p>{busqueda ? 'Sin resultados para la búsqueda' : 'Sin platillos en esta sección'}</p>
            </div>
          ) : (
            porSeccion.map(sec => (
              <div key={sec.id} style={{ marginBottom: 24 }}>

                {/* Header de sección */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{sec.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>{sec.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: 'var(--text3)',
                    background: 'var(--s2)', border: '1px solid var(--bd)',
                    padding: '1px 8px', borderRadius: 4,
                  }}>{sec.productos.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--bd)', marginLeft: 4 }} />
                </div>

                {/* Filas de productos */}
                <div style={{
                  background: 'var(--s)', borderRadius: 'var(--r)',
                  border: '1.5px solid var(--bd)', overflow: 'hidden',
                  boxShadow: 'var(--sh-xs)',
                }}>
                  {sec.productos.map((prod, idx) => (
                    <div
                      key={prod.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 14px',
                        borderBottom: idx < sec.productos.length - 1 ? '1px solid var(--s3)' : 'none',
                        opacity: prod.activo ? 1 : 0.4,
                        transition: 'background .12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Toggle on={prod.disponible} onChange={() => toggleDisponible(prod)} />

                      <span style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: 'center' }}>
                        {prod.emoji || '🍽️'}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                            {prod.nombre}
                          </span>
                          {prod.subcategoria && (() => {
                            const sc = SUBCATS.find(s => s.id === prod.subcategoria);
                            return sc ? (
                              <span style={{
                                fontSize: 9, fontWeight: 800, padding: '1px 6px',
                                borderRadius: 4, background: sc.color + '22',
                                color: sc.color, border: `1px solid ${sc.color}55`,
                                flexShrink: 0,
                              }}>{sc.label}</span>
                            ) : null;
                          })()}
                        </div>
                        {prod.descripcion && (
                          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 1 }}>
                            {prod.descripcion}
                          </div>
                        )}
                      </div>

                      <span style={{
                        fontSize: 9.5, fontWeight: 800, flexShrink: 0, minWidth: 76, textAlign: 'center',
                        color: prod.disponible ? 'var(--green)' : 'var(--text3)',
                      }}>
                        {prod.disponible ? '● Disponible' : '○ No disponible'}
                      </span>

                      {prod.subcategoria !== 'AGREGADO' && (
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: 'var(--navy)',
                        fontFamily: 'var(--font-display)', flexShrink: 0,
                        minWidth: 82, textAlign: 'right',
                      }}>
                        {formatPeso(prod.precio)}
                      </span>
                      )}

                      <button
                        onClick={() => abrirEditar(prod)}
                        style={{
                          height: 28, padding: '0 12px', fontSize: 11, fontWeight: 700,
                          background: 'var(--s2)', border: '1.5px solid var(--bd)',
                          borderRadius: 5, cursor: 'pointer', flexShrink: 0, color: 'var(--text2)',
                        }}
                      >✏️ Editar</button>
                      <button
                        onClick={() => abrirEliminar(prod)}
                        style={{
                          height: 28, padding: '0 10px', fontSize: 11, fontWeight: 700,
                          background: 'var(--red-bg)', border: '1.5px solid var(--red)',
                          borderRadius: 5, cursor: 'pointer', flexShrink: 0, color: 'var(--red)',
                        }}
                      >🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {modal === 'confirmarEliminar' && productoEditando && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">🗑️ Eliminar platillo</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              ¿Eliminar <strong style={{ color: 'var(--text)' }}>{productoEditando.nombre}</strong>?
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 20 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button
                onClick={confirmarEliminar}
                disabled={guardando}
                style={{
                  flex: 2, height: 38, borderRadius: 'var(--r-sm)', border: 'none',
                  background: 'var(--red)', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >{guardando ? 'Eliminando...' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={() => { setModal(null); setMostrarEmojis(false); }}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {modal === 'crear' ? '➕ Nuevo platillo' : `✏️ Editar — ${productoEditando?.nombre}`}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>NOMBRE *</label>
              <input className="inp" placeholder="Nombre del platillo" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, marginBottom: 10 }}>
              {form.subcategoria !== 'AGREGADO' && (
              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>PRECIO *</label>
                <input className="inp" type="number" min="0" placeholder="0" value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
              </div>
              )}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>EMOJI</label>
                <button
                  type="button"
                  onClick={() => setMostrarEmojis(v => !v)}
                  style={{
                    width: '100%', height: 38, borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--bd)', background: 'var(--s2)',
                    fontSize: 20, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >{form.emoji || '🍽️'}</button>
                {mostrarEmojis && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 100,
                    background: 'var(--surface)', border: '1.5px solid var(--bd)',
                    borderRadius: 'var(--r-sm)', padding: 8, marginTop: 4,
                    display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2,
                    width: 260, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                  }}>
                    {EMOJIS_RESTAURANTE.map(e => (
                      <button
                        key={e} type="button"
                        onClick={() => { setForm(f => ({ ...f, emoji: e })); setMostrarEmojis(false); }}
                        title={e}
                        style={{
                          fontSize: 20, background: form.emoji === e ? 'var(--gold-bg)' : 'transparent',
                          border: form.emoji === e ? '1.5px solid var(--gold-bd)' : '1.5px solid transparent',
                          borderRadius: 6, cursor: 'pointer', padding: 3,
                          lineHeight: 1.2,
                        }}
                      >{e}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMostrarEmojis(false)}
                      style={{
                        gridColumn: '1 / -1', marginTop: 4, fontSize: 10, fontWeight: 700,
                        color: 'var(--text3)', background: 'transparent', border: 'none',
                        cursor: 'pointer', padding: '2px 0',
                      }}
                    >✕ cerrar</button>
                  </div>
                )}
              </div>
            </div>

            {form.subcategoria === 'AGREGADO' ? (
              <div style={{
                marginBottom: 10, padding: '8px 12px',
                background: '#c0351a18', border: '1px solid #c0351a55',
                borderRadius: 'var(--r-sm)', fontSize: 11.5, color: '#c0351a', fontWeight: 600,
              }}>
                🍽️ Los agregados se muestran en <strong>Almuerzo, Alm. Especial, Cena y Cena Especial</strong>
              </div>
            ) : (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>MENÚ DEL DÍA *</label>
              <select className="inp" value={form.tipoMenu}
                onChange={e => setForm(f => ({ ...f, tipoMenu: e.target.value as TipoMenu, subcategoria: '' }))}>
                {SECCIONES.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            )}

            {(TIPOS_CON_SUBCAT as readonly string[]).includes(form.tipoMenu) && (() => {
              const subcatsDisponibles = (['DESAYUNO', 'BEBIDA'] as string[]).includes(form.tipoMenu)
                ? [{ id: 'CAFE_TE', label: 'Té / Café' }, { id: 'ACOMPANIAMIENTO', label: 'Sándwich / Acompaño' }]
                : SUBCATS.filter(s =>
                    s.id !== 'AGREGADO' || MENUS_CON_AGREGADOS_INV.includes(form.tipoMenu)
                  ).map(s => ({ id: s.id, label: s.label }));
              return (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>SUBCATEGORÍA</label>
                  <select className="inp" value={form.subcategoria}
                    onChange={e => {
                      const val = e.target.value as SubcategoriaMenu | '';
                      setForm(f => ({
                        ...f,
                        subcategoria: val,
                        ...(val === 'AGREGADO' ? { tipoMenu: 'ALMUERZO' as TipoMenu, precio: '0' } : {}),
                      }));
                    }}>
                    <option value=''>— Sin subcategoría —</option>
                    {subcatsDisponibles.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              );
            })()}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>DESCRIPCIÓN (opcional)</label>
              <textarea
                className="inp" placeholder="Descripción breve del platillo..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                style={{ height: 60, resize: 'none', paddingTop: 8, lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              padding: '8px 12px', background: 'var(--s2)', borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--bd)',
            }}>
              <Toggle on={form.disponible} onChange={() => setForm(f => ({ ...f, disponible: !f.disponible }))} />
              <span style={{ fontSize: 12, fontWeight: 600, color: form.disponible ? 'var(--green)' : 'var(--text3)' }}>
                {form.disponible ? 'Disponible en el menú' : 'No disponible en el menú'}
              </span>
            </div>

            {errModal && (
              <div style={{
                background: 'var(--red-bg)', color: 'var(--red)',
                fontSize: 11.5, fontWeight: 700,
                padding: '7px 10px', borderRadius: 5, marginBottom: 12,
              }}>⚠ {errModal}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => { setModal(null); setMostrarEmojis(false); }}>Cancelar</button>
              <button
                className="btn-primary" style={{ flex: 2 }}
                onClick={guardarProducto}
                disabled={guardando || !form.nombre.trim() || !form.precio}
              >
                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear platillo' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioPage;
