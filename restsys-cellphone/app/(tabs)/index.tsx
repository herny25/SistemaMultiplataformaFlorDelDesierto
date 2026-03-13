import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { productosApi, empresasApi } from '@/services/api';
import { enviarOrden } from '@/services/socket';
import type { Producto, ItemCarrito, AgregadoCarrito, TipoMenu, SubcategoriaMenu } from '../../src/types';
import { TIPOS_CON_SUBCAT, SUBCATS_POR_TIPO, MENUS_CON_AGREGADOS } from '../../src/types';
import { COLORS, RADIUS, SHADOW } from '../../src/utils/theme';

const formatPeso = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(n);

// ─── Constantes de tipoMenu ───────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoMenu, string> = {
  DESAYUNO:             'Desayuno',
  ALMUERZO:             'Almuerzo',
  ALMUERZO_ESPECIAL:    'Alm. Especial',
  COLACION:             'Colación',
  COLACION_ESPECIAL:    'Col. Especial',
  COLACION_MEDIA_MANANA:'Col. Mañana',
  COLACION_FRIA:        'Col. Fría',
  CENA:                 'Cena',
  CENA_ESPECIAL:        'Cena Especial',
  BEBIDA:               'Bebida',
  CHURRASCO:            'Churrasco',
  OTRO:                 'Otro',
};

const TIPO_EMOJIS: Record<TipoMenu, string> = {
  DESAYUNO:             '🌅',
  ALMUERZO:             '🍽️',
  ALMUERZO_ESPECIAL:    '⭐',
  COLACION:             '🥪',
  COLACION_ESPECIAL:    '✨',
  COLACION_MEDIA_MANANA:'☕',
  COLACION_FRIA:        '🧊',
  CENA:                 '🌙',
  CENA_ESPECIAL:        '🌟',
  BEBIDA:               '🥤',
  CHURRASCO:            '🥩',
  OTRO:                 '📌',
};

// Orden deseado de aparición
const TIPOS_ORDEN: TipoMenu[] = [
  'DESAYUNO', 'ALMUERZO', 'ALMUERZO_ESPECIAL',
  'COLACION', 'COLACION_ESPECIAL', 'COLACION_MEDIA_MANANA', 'COLACION_FRIA',
  'CENA', 'CENA_ESPECIAL', 'BEBIDA', 'CHURRASCO', 'OTRO',
];

// ─────────────────────────────────────────────────────────────────────────────

export default function NuevaOrdenScreen() {
  const { garzon, cerrarSesion, conectado, productoAgotado } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Datos del menú
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tiposDisponibles, setTiposDisponibles] = useState<TipoMenu[]>([]);
  const [tipoActivo, setTipoActivo] = useState<TipoMenu | null>(null);
  const [subcatActiva, setSubcatActiva] = useState<SubcategoriaMenu | 'TODOS'>('TODOS');
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Orden actual
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [mesa, setMesa] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [obs, setObs] = useState('');
  const [esPensionado, setEsPensionado] = useState(false);
  const [empresas, setEmpresas] = useState<Array<{ id: number; nombre: string }>>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<{ id: number; nombre: string } | null>(null);
  const [modalEmpresas, setModalEmpresas] = useState(false);

  // UI
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [modalAgregados, setModalAgregados] = useState<{
    fondo: Producto;
    seleccionados: number[];
    editando: boolean;
    editandoIdx?: number;
  } | null>(null);


  // ── Cargar menú ─────────────────────────────────────────────────────────────
  const cargarMenu = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoMenu(true);
    try {
      const data = await productosApi.getDisponibles();
      const prods: Producto[] = Array.isArray(data) ? data : [];
      setProductos(prods);
      // Siempre mostrar todos los tipos en el mismo orden que el POS
      setTiposDisponibles(TIPOS_ORDEN);
      setTipoActivo(prev => prev ?? TIPOS_ORDEN[0]);
    } catch {
      if (!silencioso) {
        Alert.alert(
          'Sin conexión',
          'No se pudo cargar el menú.\nVerifica que estés en la misma red WiFi que el servidor.',
          [{ text: 'Reintentar', onPress: () => cargarMenu() }]
        );
      }
    } finally {
      setCargandoMenu(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { if (garzon) cargarMenu(); }, [cargarMenu, garzon]);

  useEffect(() => {
    empresasApi.getAll().then(setEmpresas).catch(() => {});
  }, []);

  // Recargar menú y empresas cada vez que el garzón vuelve a esta pantalla
  useFocusEffect(useCallback(() => {
    if (garzon) {
      cargarMenu(true);
      empresasApi.getAll().then(setEmpresas).catch(() => {});
    }
  }, [garzon, cargarMenu]));

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarMenu(true);
  }, [cargarMenu]);

  // ── Carrito ──────────────────────────────────────────────────────────────────
  const agregarItem = (prod: Producto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Si es FONDO en un menú con agregados y no está aún en el carrito → abre modal
    if (
      prod.subcategoria === 'FONDO' &&
      (MENUS_CON_AGREGADOS as readonly string[]).includes(prod.tipoMenu)
    ) {
      const hayAgregados = productos.some(
        p => p.subcategoria === 'AGREGADO' && p.disponible
      );
      if (hayAgregados) {
        setModalAgregados({ fondo: prod, seleccionados: [], editando: false });
        return;
      }
    }

    setCarrito(prev => {
      const existe = prev.find(i => i.productoId === prod.id);
      if (existe) {
        return prev.map(i =>
          i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, {
        productoId: prod.id,
        nombre: prod.nombre,
        emoji: prod.emoji,
        precio: Number(prod.precio),
        cantidad: 1,
      }];
    });
  };

  const confirmarAgregados = (overrideSeleccionados?: number[]) => {
    if (!modalAgregados) return;
    const { fondo, editando, editandoIdx } = modalAgregados;
    const selIds = overrideSeleccionados ?? modalAgregados.seleccionados;

    const agregadosObjs: AgregadoCarrito[] = selIds
      .map(id => productos.find(p => p.id === id))
      .filter((p): p is Producto => p !== undefined)
      .map(p => ({ productoId: p.id, nombre: p.nombre, emoji: p.emoji, precio: Number(p.precio) }));

    if (editando && editandoIdx !== undefined) {
      setCarrito(prev => prev.map((i, j) =>
        j === editandoIdx ? { ...i, agregados: agregadosObjs } : i
      ));
    } else {
      const sortedNewIds = [...selIds].sort((a, b) => a - b);
      const existente = carrito.find(i => {
        if (i.productoId !== fondo.id) return false;
        const existingIds = (i.agregados ?? []).map(a => a.productoId).sort((a, b) => a - b);
        return JSON.stringify(existingIds) === JSON.stringify(sortedNewIds);
      });
      if (existente) {
        setCarrito(prev => prev.map(i =>
          i === existente ? { ...i, cantidad: i.cantidad + 1 } : i
        ));
      } else {
        setCarrito(prev => [...prev, {
          productoId: fondo.id,
          nombre: fondo.nombre,
          emoji: fondo.emoji,
          precio: Number(fondo.precio),
          cantidad: 1,
          agregados: agregadosObjs,
        }]);
      }
    }

    setModalAgregados(null);
  };

  const cambiarCantidad = (idx: number, delta: number) => {
    Haptics.selectionAsync();
    setCarrito(prev =>
      prev
        .map((i, j) => j === idx ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    );
  };

  const limpiar = () => {
    setCarrito([]);
    setMesa('');
    setNombreCliente('');
    setObs('');
    setEsPensionado(false);
    setEmpresaSeleccionada(null);
    setModalCarrito(false);
    setModalAgregados(null);
  };

  const total     = carrito.reduce((acc, i) => {
    const agrTotal = (i.agregados ?? []).reduce((s, a) => s + a.precio, 0);
    return acc + (i.precio + agrTotal) * i.cantidad;
  }, 0);
  const cantItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  const esMenuConSubcat = tipoActivo ? (TIPOS_CON_SUBCAT as TipoMenu[]).includes(tipoActivo) : false;

  const prodsPorTipo = tipoActivo
    ? productos.filter(p => p.tipoMenu === tipoActivo && p.subcategoria !== 'AGREGADO')
    : productos.filter(p => p.subcategoria !== 'AGREGADO');

  const prodsFiltrados = esMenuConSubcat && subcatActiva !== 'TODOS'
    ? prodsPorTipo.filter(p => p.subcategoria === subcatActiva)
    : prodsPorTipo;

  const seleccionarTipo = (tipo: TipoMenu) => {
    setTipoActivo(tipo);
    setSubcatActiva('TODOS');
  };

  // ── Enviar orden ─────────────────────────────────────────────────────────────
  const enviar = async () => {
    if (!mesa.trim()) {
      Alert.alert('Falta la mesa', 'Escribe el número de mesa antes de enviar.');
      return;
    }
    if (carrito.length === 0) {
      Alert.alert('Carrito vacío', 'Selecciona al menos un producto.');
      return;
    }
    if (!conectado) {
      Alert.alert('Sin conexión', 'No hay conexión con el servidor. Verifica el WiFi.');
      return;
    }

    setEnviando(true);
    try {
      const clienteNombre = nombreCliente.trim() || `Mesa ${mesa.trim()}`;
      await enviarOrden({
        nombreCliente: clienteNombre,
        mesa: mesa.trim(),
        garzon: garzon!,
        items: carrito.flatMap(i => [
          { productoId: i.productoId, cantidad: i.cantidad },
          ...(i.agregados ?? []).map(a => ({ productoId: a.productoId, cantidad: i.cantidad })),
        ]),
        observaciones: obs.trim() || undefined,
        tipoCliente: esPensionado ? 'PENSIONADO' : 'PARTICULAR',
        empresaNombre: esPensionado ? empresaSeleccionada?.nombre : undefined,
        comandaLineas: carrito.map(i => ({
          cantidad: i.cantidad,
          nombre: i.nombre,
          ...(i.agregados?.length ? { agregados: i.agregados.map(a => a.nombre) } : {}),
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEnviado(true);
      setModalCarrito(false);
      setTimeout(() => { setEnviado(false); limpiar(); }, 2500);
    } catch (e: any) {
      Alert.alert('Error al enviar', e.message || 'Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── TOPBAR ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Text style={styles.logo}>RestSys</Text>
          <View style={[styles.dot, { backgroundColor: conectado ? '#22c97a' : COLORS.red }]} />
        </View>

        <View style={styles.topbarCenter}>
          <Text style={styles.topbarGarzon}>👤 {garzon}</Text>
          <Text style={[styles.topbarStatus, { color: conectado ? '#22c97a' : COLORS.red }]}>
            {conectado ? 'conectado' : 'sin conexión'}
          </Text>
        </View>

        <TouchableOpacity onPress={cerrarSesion} style={styles.salirBtn}>
          <Text style={styles.salirText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* ── ALERTA PRODUCTO AGOTADO ── */}
      {productoAgotado && (
        <View style={styles.alertaAgotado}>
          <Text style={styles.alertaAgotadoText}>
            ⚠️  &quot;{productoAgotado.nombre}&quot; se agotó — retíralo del pedido
          </Text>
        </View>
      )}

      {/* ── CONFIRMACIÓN DE ENVÍO ── */}
      {enviado && (
        <View style={styles.enviado}>
          <Text style={styles.enviadoText}>✅  ¡Orden enviada al cajero!</Text>
        </View>
      )}

      {/* ── CAMPOS: MESA + CLIENTE ── */}
      <View style={styles.camposRow}>
        <TextInput
          style={[styles.inp, styles.inpMesa]}
          placeholder="Mesa *"
          placeholderTextColor={COLORS.text3}
          value={mesa}
          onChangeText={setMesa}
          keyboardType="numeric"
          maxLength={4}
        />
        <TextInput
          style={[styles.inp, { flex: 1 }]}
          placeholder="Nombre cliente (opcional)"
          placeholderTextColor={COLORS.text3}
          value={nombreCliente}
          onChangeText={setNombreCliente}
          autoCapitalize="words"
        />
        <TouchableOpacity
          onPress={() => { setEsPensionado(p => !p); if (!esPensionado) setModalEmpresas(true); }}
          style={[styles.pensionadoToggle, esPensionado && styles.pensionadoToggleActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.pensionadoToggleText, esPensionado && styles.pensionadoToggleTextActive]}>
            {esPensionado ? '🏢' : '🏢?'}
          </Text>
        </TouchableOpacity>
      </View>
      {esPensionado && (
        <TouchableOpacity
          onPress={() => setModalEmpresas(true)}
          style={styles.empresaRow}
          activeOpacity={0.8}
        >
          <Text style={styles.empresaLabel}>
            {empresaSeleccionada ? empresaSeleccionada.nombre : 'Seleccionar empresa...'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── BARRA TIPO MENÚ ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catsBar}
        contentContainerStyle={styles.catsBarContent}
      >
        {tiposDisponibles.map(tipo => (
          <TouchableOpacity
            key={tipo}
            onPress={() => seleccionarTipo(tipo)}
            style={[styles.catChip, tipoActivo === tipo && styles.catChipActive]}
            activeOpacity={0.75}
          >
            <Text style={styles.catEmoji}>{TIPO_EMOJIS[tipo]}</Text>
            <Text style={[styles.catLabel, tipoActivo === tipo && styles.catLabelActive]}>
              {TIPO_LABELS[tipo]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── SUBCATEGORÍAS (dinámicas según tipo de menú activo) ── */}
      {esMenuConSubcat && (() => {
        const subcatsActuales = tipoActivo ? (SUBCATS_POR_TIPO[tipoActivo] ?? []) : [];
        const todosItem = { id: 'TODOS' as const, label: 'Todos' };
        const items = [todosItem, ...subcatsActuales];
        return (
          <View style={styles.subcatBar}>
            {items.map(sc => {
              const count = sc.id === 'TODOS'
                ? prodsPorTipo.length
                : prodsPorTipo.filter(p => p.subcategoria === sc.id).length;
              const activo = subcatActiva === sc.id;
              return (
                <TouchableOpacity
                  key={sc.id}
                  onPress={() => setSubcatActiva(sc.id as SubcategoriaMenu | 'TODOS')}
                  style={[styles.subcatBtn, activo && styles.subcatBtnActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.subcatLabel, activo && styles.subcatLabelActive]}>
                    {sc.label}
                  </Text>
                  <View style={[styles.subcatBadge, activo && styles.subcatBadgeActive]}>
                    <Text style={[styles.subcatBadgeText, activo && styles.subcatBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })()}

      {/* ── GRID DE PRODUCTOS ── */}
      {cargandoMenu ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.navy} />
          <Text style={styles.loaderText}>Cargando menú...</Text>
        </View>
      ) : (
        <FlatList
          data={prodsFiltrados}
          keyExtractor={p => String(p.id)}
          numColumns={2}
          style={styles.grid}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: carrito.length > 0 ? 90 : insets.bottom + 16 },
          ]}
          columnWrapperStyle={{ gap: 9 }}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              colors={[COLORS.navy]}
              tintColor={COLORS.navy}
            />
          }
          renderItem={({ item: prod }) => {
            const enCarrito = carrito.find(i => i.productoId === prod.id);
            return (
              <TouchableOpacity
                onPress={() => agregarItem(prod)}
                style={[styles.prodCard, enCarrito && styles.prodCardActivo]}
                activeOpacity={0.82}
              >
                <Text style={styles.prodEmoji}>{prod.emoji || '🍽️'}</Text>
                <Text style={styles.prodNombre} numberOfLines={2}>{prod.nombre}</Text>
                {prod.subcategoria && (
                  <Text style={styles.prodSubcat}>{prod.subcategoria.toLowerCase()}</Text>
                )}
                <Text style={styles.prodPrecio}>{formatPeso(prod.precio)}</Text>

                {enCarrito && (
                  <View style={styles.prodBadge}>
                    <Text style={styles.prodBadgeText}>{enCarrito.cantidad}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMenu}>
              <Text style={{ fontSize: 36, opacity: 0.25 }}>🍽️</Text>
              <Text style={styles.emptyMenuText}>Sin productos en esta categoría</Text>
            </View>
          }
        />
      )}

      {/* ── BOTÓN FLOTANTE CARRITO ── */}
      {carrito.length > 0 && !enviado && (
        <TouchableOpacity
          style={[styles.carritoFab, { bottom: insets.bottom + 14 }]}
          onPress={() => setModalCarrito(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.fabEmoji}>🛒</Text>
          <Text style={styles.fabLabel}>Ver pedido</Text>
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{cantItems}</Text>
          </View>
          <Text style={styles.fabTotal}>{formatPeso(total)}</Text>
        </TouchableOpacity>
      )}

      {/* ── MODAL RESUMEN + ENVÍO ── */}
      <Modal
        visible={modalCarrito}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalCarrito(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 8 }]}>

            {/* Header modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resumen del pedido</Text>
              <TouchableOpacity onPress={() => setModalCarrito(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Info mesa */}
            <View style={styles.modalMesaRow}>
              <View style={styles.mesaBadge}>
                <Text style={styles.mesaBadgeText}>
                  {mesa ? `Mesa ${mesa}` : '⚠ Sin mesa'}
                </Text>
              </View>
              {nombreCliente ? (
                <Text style={styles.modalCliente}>{nombreCliente}</Text>
              ) : null}
              <Text style={styles.modalGarzon}>Garzón: {garzon}</Text>
            </View>

            {/* Lista de ítems */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {carrito.map((item, idx) => {
                const pInfo = productos.find(p => p.id === item.productoId);
                const puedeEditar =
                  pInfo?.subcategoria === 'FONDO' &&
                  (MENUS_CON_AGREGADOS as readonly string[]).includes(pInfo.tipoMenu);
                const agrTotal = (item.agregados ?? []).reduce((s, a) => s + a.precio, 0);
                return (
                  <View key={idx}>
                    <View style={styles.modalItemRow}>
                      <Text style={styles.modalItemEmoji}>{item.emoji || '🍽️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemNombre} numberOfLines={1}>{item.nombre}</Text>
                        {item.agregados && item.agregados.length > 0 && (
                          <Text style={styles.modalItemAgrs} numberOfLines={2}>
                            {item.agregados.map(a => a.nombre).join(', ')}
                          </Text>
                        )}
                      </View>

                      {puedeEditar && (
                        <TouchableOpacity
                          onPress={() => setModalAgregados({
                            fondo: pInfo!,
                            seleccionados: item.agregados?.map(a => a.productoId) ?? [],
                            editando: true,
                            editandoIdx: idx,
                          })}
                          style={styles.editAgrsBtn}
                        >
                          <Text style={styles.editAgrsBtnText}>
                            {item.agregados && item.agregados.length > 0
                              ? `+${item.agregados.length}`
                              : '+ extra'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.cantControles}>
                        <TouchableOpacity
                          onPress={() => cambiarCantidad(idx, -1)}
                          style={styles.cantBtn}
                        >
                          <Text style={styles.cantBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.cantNum}>{item.cantidad}</Text>
                        <TouchableOpacity
                          onPress={() => cambiarCantidad(idx, 1)}
                          style={styles.cantBtn}
                        >
                          <Text style={styles.cantBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.modalItemSubtotal}>
                        {formatPeso((item.precio + agrTotal) * item.cantidad)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Observaciones */}
            <TextInput
              style={styles.obsInput}
              placeholder="Observaciones (sin cebolla, punto de cocción...)"
              placeholderTextColor={COLORS.text3}
              value={obs}
              onChangeText={setObs}
              multiline
              maxLength={140}
            />

            {/* Total + botón enviar */}
            <View style={styles.modalFooter}>
              <View>
                <Text style={styles.modalTotalLabel}>
                  {cantItems} ítem{cantItems > 1 ? 's' : ''}
                </Text>
                <Text style={styles.modalTotal}>{formatPeso(total)}</Text>
              </View>

              <TouchableOpacity
                onPress={enviar}
                disabled={enviando || !mesa.trim()}
                style={[
                  styles.btnEnviar,
                  (enviando || !mesa.trim()) && styles.btnDisabled,
                ]}
                activeOpacity={0.85}
              >
                {enviando
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.btnEnviarText}>⚡  Enviar al cajero</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Botón limpiar */}
            <TouchableOpacity onPress={limpiar} style={styles.btnLimpiar}>
              <Text style={styles.btnLimpiarText}>🗑  Limpiar pedido</Text>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL EMPRESAS ── */}
      <Modal
        visible={modalEmpresas}
        animationType="slide"
        transparent
        onRequestClose={() => setModalEmpresas(false)}
      >
        <View style={styles.agrsOverlay}>
          <View style={styles.agrsSheet}>
            <View style={styles.agrsHeader}>
              <Text style={styles.agrsTitle}>Seleccionar empresa</Text>
              <TouchableOpacity onPress={() => setModalEmpresas(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.agrsScroll}>
              {empresas.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  onPress={() => { setEmpresaSeleccionada(emp); setModalEmpresas(false); }}
                  style={[styles.agrItem, empresaSeleccionada?.id === emp.id && styles.agrItemActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.agrNombre, empresaSeleccionada?.id === emp.id && styles.agrNombreActive]}>
                    {emp.nombre}
                  </Text>
                  {empresaSeleccionada?.id === emp.id && <Text style={styles.agrCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              {empresas.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.text3 }}>Sin empresas registradas</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL AGREGADOS ── */}
      <Modal
        visible={modalAgregados !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAgregados(null)}
      >
        <View style={styles.agrsOverlay}>
          <View style={styles.agrsSheet}>
            <View style={styles.agrsHeader}>
              <Text style={styles.agrsTitle}>
                {modalAgregados?.fondo.emoji ?? '🍽️'}{'  '}Agregados para {modalAgregados?.fondo.nombre}
              </Text>
              <TouchableOpacity onPress={() => setModalAgregados(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.agrsScroll}>
              {productos
                .filter(p => p.subcategoria === 'AGREGADO' && p.disponible)
                .map(agr => {
                  const sel = modalAgregados?.seleccionados.includes(agr.id) ?? false;
                  return (
                    <TouchableOpacity
                      key={agr.id}
                      onPress={() => {
                        if (!modalAgregados) return;
                        setModalAgregados(prev => {
                          if (!prev) return prev;
                          const newSel = prev.seleccionados.includes(agr.id)
                            ? prev.seleccionados.filter(id => id !== agr.id)
                            : [...prev.seleccionados, agr.id];
                          return { ...prev, seleccionados: newSel };
                        });
                      }}
                      style={[styles.agrItem, sel && styles.agrItemActive]}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.agrEmoji}>{agr.emoji || '➕'}</Text>
                      <Text style={[styles.agrNombre, sel && styles.agrNombreActive]}>
                        {agr.nombre}
                      </Text>
                      <Text style={[styles.agrPrecio, sel && styles.agrPrecioActive]}>
                        {agr.precio > 0 ? `+${formatPeso(agr.precio)}` : 'incluido'}
                      </Text>
                      {sel && <Text style={styles.agrCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.agrsBtns}>
              <TouchableOpacity
                onPress={() => confirmarAgregados([])}
                style={styles.agrsBtnSecondary}
              >
                <Text style={styles.agrsBtnSecondaryText}>Sin extras</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmarAgregados()}
                style={styles.agrsBtn}
              >
                <Text style={styles.agrsBtnText}>
                  {modalAgregados?.editando ? 'Actualizar' : 'Agregar al pedido'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Topbar
  topbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logo: { fontSize: 17, fontWeight: '700', color: COLORS.gold, fontStyle: 'italic' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  topbarCenter: { flex: 1, alignItems: 'center' },
  topbarGarzon: { fontSize: 12.5, fontWeight: '700', color: 'white' },
  topbarStatus: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  salirBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.xs,
  },
  salirText: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },

  // Alertas
  alertaAgotado: {
    backgroundColor: COLORS.orangeBg, paddingVertical: 8, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.orange,
  },
  alertaAgotadoText: { fontSize: 12, fontWeight: '700', color: COLORS.orange, textAlign: 'center' },
  enviado: {
    backgroundColor: COLORS.greenBg, paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.green,
  },
  enviadoText: { fontSize: 13.5, fontWeight: '800', color: COLORS.green, textAlign: 'center' },

  // Campos
  camposRow: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
  },
  inp: {
    height: 42, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: 12,
    fontSize: 14, fontWeight: '600', color: COLORS.text,
    backgroundColor: COLORS.surface2,
  },
  inpMesa: { width: 82 },
  pensionadoToggle: {
    height: 42, paddingHorizontal: 12, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  pensionadoToggleActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  pensionadoToggleText: { fontSize: 16, color: COLORS.text3 },
  pensionadoToggleTextActive: { color: 'white' },
  empresaRow: {
    marginHorizontal: 10, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  empresaLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy },

  // Barra tipoMenu
  catsBar: {
    maxHeight: 48, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    flexShrink: 0,
  },
  catsBarContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 7, alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border2,
    backgroundColor: COLORS.surface,
  },
  catChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  catEmoji: { fontSize: 13 },
  catLabel: { fontSize: 11.5, fontWeight: '700', color: COLORS.text2 },
  catLabelActive: { color: 'white' },

  // Subcategorías
  subcatBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface2,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 6, gap: 8,
  },
  subcatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border2,
    backgroundColor: COLORS.surface,
  },
  subcatBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  subcatLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text2 },
  subcatLabelActive: { color: 'white' },
  subcatBadge: {
    backgroundColor: COLORS.border2, borderRadius: RADIUS.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  subcatBadgeActive: { backgroundColor: COLORS.gold },
  subcatBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.text2 },
  subcatBadgeTextActive: { color: COLORS.navy },

  // Grid productos
  grid: { flex: 1 },
  gridContent: { padding: 10, gap: 9 },
  prodCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 13,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', gap: 4,
    ...SHADOW.sm,
  },
  prodCardActivo: { borderColor: COLORS.green, backgroundColor: COLORS.greenBg },
  prodEmoji: { fontSize: 30, marginBottom: 2 },
  prodNombre: {
    fontSize: 12, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', lineHeight: 16,
  },
  prodSubcat: {
    fontSize: 10, fontWeight: '600', color: COLORS.text3,
    textTransform: 'capitalize',
  },
  prodPrecio: { fontSize: 13, fontWeight: '800', color: COLORS.navy },
  prodBadge: {
    position: 'absolute', top: 7, right: 7,
    backgroundColor: COLORS.green, borderRadius: RADIUS.full,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  prodBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: COLORS.text3 },
  emptyMenu: { paddingTop: 50, alignItems: 'center', gap: 10 },
  emptyMenuText: { fontSize: 13, color: COLORS.text3 },

  // FAB carrito
  carritoFab: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg, height: 56,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, gap: 10,
    ...SHADOW.md,
  },
  fabEmoji: { fontSize: 20 },
  fabLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '700', flex: 1 },
  fabBadge: {
    backgroundColor: COLORS.gold, borderRadius: RADIUS.full,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  fabBadgeText: { color: COLORS.navy, fontSize: 12, fontWeight: '800' },
  fabTotal: { color: 'white', fontSize: 15, fontWeight: '800' },

  // Modal
  modalContainer: {
    flex: 1, backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
    marginBottom: 10,
  },
  modalTitle: {
    flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.navy,
  },
  modalClose: { padding: 6 },
  modalCloseText: { fontSize: 16, color: COLORS.text3, fontWeight: '700' },
  modalMesaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, flexWrap: 'wrap',
  },
  mesaBadge: {
    backgroundColor: COLORS.navy, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  mesaBadgeText: { color: COLORS.gold, fontSize: 13, fontWeight: '800' },
  modalCliente: { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 },
  modalGarzon: { fontSize: 11, color: COLORS.text3, fontWeight: '600' },
  modalScroll: { maxHeight: 280 },
  modalItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.surface2,
  },
  modalItemEmoji: { fontSize: 18 },
  modalItemNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  cantControles: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cantBtn: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  cantBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text2 },
  cantNum: {
    fontSize: 14, fontWeight: '800', color: COLORS.text,
    width: 22, textAlign: 'center',
  },
  modalItemSubtotal: {
    fontSize: 13, fontWeight: '800', color: COLORS.navy,
    minWidth: 64, textAlign: 'right',
  },
  obsInput: {
    marginTop: 12, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surface2,
    minHeight: 52, maxHeight: 72, textAlignVertical: 'top',
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1.5, borderTopColor: COLORS.border,
  },
  modalTotalLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '600' },
  modalTotal: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  btnEnviar: {
    backgroundColor: COLORS.navy, paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.sm,
  },
  btnDisabled: { opacity: 0.3 },
  btnEnviarText: { color: 'white', fontSize: 14, fontWeight: '800' },
  btnLimpiar: { alignItems: 'center', paddingVertical: 10 },
  btnLimpiarText: { fontSize: 12.5, color: COLORS.text3, fontWeight: '600' },

  // Cart item — agregados display
  modalItemAgrs: {
    fontSize: 11, color: COLORS.text3, fontWeight: '500', marginTop: 2,
  },
  editAgrsBtn: {
    backgroundColor: COLORS.gold, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.xs, marginRight: 4,
  },
  editAgrsBtnText: { fontSize: 10, fontWeight: '800', color: COLORS.navy },

  // Agregados modal
  agrsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  agrsSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    maxHeight: '75%', paddingBottom: 20,
  },
  agrsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
  },
  agrsTitle: {
    flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.navy,
  },
  agrsScroll: { maxHeight: 340 },
  agrItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.surface2,
  },
  agrItemActive: { backgroundColor: COLORS.greenBg },
  agrEmoji: { fontSize: 20 },
  agrNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  agrNombreActive: { color: COLORS.green, fontWeight: '700' },
  agrPrecio: { fontSize: 13, fontWeight: '700', color: COLORS.text2 },
  agrPrecioActive: { color: COLORS.green },
  agrCheck: { fontSize: 14, color: COLORS.green, fontWeight: '800', marginLeft: 2 },
  agrsBtns: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14,
  },
  agrsBtnSecondary: {
    flex: 1, paddingVertical: 13, borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.border2, alignItems: 'center',
  },
  agrsBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: COLORS.text2 },
  agrsBtn: {
    flex: 2, paddingVertical: 13, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.navy, alignItems: 'center',
  },
  agrsBtnText: { fontSize: 13, fontWeight: '800', color: 'white' },
});
