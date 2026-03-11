import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ScrollView, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, Modal,
} from 'react-native';
import { productosApi } from '../services/api';
import { enviarOrden, onOrdenProcesada, offOrdenProcesada, isConectado } from '../services/socket';
import { formatPeso, formatHora } from '../utils/format';
import type { Producto, Categoria, ItemCarrito, OrdenEnviada } from '../types';

interface Props {
  nombreGarzon: string;
  onOrdenEnviada: (orden: OrdenEnviada) => void;
}

const NuevaOrdenScreen: React.FC<Props> = ({ nombreGarzon, onOrdenEnviada }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catActiva, setCatActiva] = useState<number | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [mesa, setMesa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [errorConexion, setErrorConexion] = useState(false);

  const cargarMenu = useCallback(async () => {
    setCargandoMenu(true);
    setErrorConexion(false);
    try {
      const [prods, cats] = await Promise.all([
        productosApi.getDisponibles(),
        productosApi.getCategorias(),
      ]);
      setProductos(prods);
      setCategorias(cats);
      if (cats.length > 0) setCatActiva(cats[0].id);
    } catch {
      setErrorConexion(true);
    } finally {
      setCargandoMenu(false);
    }
  }, []);

  useEffect(() => {
    cargarMenu();
    // Escuchar cuando el cajero procesa nuestra orden
    onOrdenProcesada(({ mesa: mesaProcesada }) => {
      Alert.alert('✅ Orden procesada', `La orden de mesa ${mesaProcesada} fue cobrada por el cajero.`);
    });
    return () => offOrdenProcesada();
  }, [cargarMenu]);

  const agregarItem = (prod: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.productoId === prod.id);
      if (existe) {
        return prev.map(i => i.productoId === prod.id
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
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

  const cambiarCantidad = (productoId: number, delta: number) => {
    setCarrito(prev =>
      prev.map(i => {
        if (i.productoId !== productoId) return i;
        const nueva = i.cantidad + delta;
        if (nueva <= 0) return null as any;
        return { ...i, cantidad: nueva };
      }).filter(Boolean)
    );
  };

  const limpiar = () => {
    setCarrito([]);
    setNombreCliente('');
    setMesa('');
    setObservaciones('');
    setModalCarrito(false);
  };

  const enviar = async () => {
    if (!mesa.trim()) { Alert.alert('Falta la mesa', 'Ingresa el número de mesa'); return; }
    if (carrito.length === 0) { Alert.alert('Carrito vacío', 'Agrega al menos un producto'); return; }
    if (!isConectado()) { Alert.alert('Sin conexión', 'No hay conexión con el servidor'); return; }

    setEnviando(true);
    try {
      const ordenData = {
        nombreCliente: nombreCliente.trim() || `Mesa ${mesa}`,
        mesa: mesa.trim(),
        garzon: nombreGarzon,
        items: carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
        observaciones: observaciones.trim() || undefined,
      };

      enviarOrden(ordenData);

      const ordenEnviada: OrdenEnviada = {
        id: Date.now().toString(),
        nombreCliente: ordenData.nombreCliente,
        mesa: ordenData.mesa,
        items: [...carrito],
        total: carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
        estado: 'enviada',
        hora: formatHora(new Date()),
      };

      onOrdenEnviada(ordenEnviada);
      limpiar();
      Alert.alert('✅ Orden enviada', `Mesa ${mesa} — El cajero la recibió.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar la orden');
    } finally {
      setEnviando(false);
    }
  };

  const total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  const prodsFiltrados = catActiva
    ? productos.filter(p => p.categoriaId === catActiva)
    : productos;

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (cargandoMenu) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0d1f38" />
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );
  }

  if (errorConexion) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
        <Text style={styles.errorTitle}>Sin conexión</Text>
        <Text style={styles.errorDesc}>No se pudo cargar el menú</Text>
        <TouchableOpacity style={styles.btnReintentar} onPress={cargarMenu}>
          <Text style={styles.btnReintentarText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1f38" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nueva Orden</Text>
          <Text style={styles.headerSub}>Garzón: {nombreGarzon}</Text>
        </View>
        {carrito.length > 0 && (
          <TouchableOpacity
            style={styles.btnCarritoHeader}
            onPress={() => setModalCarrito(true)}
          >
            <Text style={styles.btnCarritoHeaderText}>🛒 {totalItems}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── MESA + CLIENTE ── */}
      <View style={styles.infoBar}>
        <TextInput
          style={[styles.infoInput, styles.infoInputMesa]}
          placeholder="Mesa"
          placeholderTextColor="#8fa0b4"
          value={mesa}
          onChangeText={setMesa}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.infoInput, { flex: 1 }]}
          placeholder="Nombre del cliente (opcional)"
          placeholderTextColor="#8fa0b4"
          value={nombreCliente}
          onChangeText={setNombreCliente}
        />
      </View>

      {/* ── CATEGORÍAS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catBar}
        contentContainerStyle={styles.catBarContent}
      >
        {categorias.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setCatActiva(cat.id)}
            style={[styles.catBtn, catActiva === cat.id && styles.catBtnActive]}
          >
            <Text style={[styles.catText, catActiva === cat.id && styles.catTextActive]}>
              {cat.emoji} {cat.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── GRID DE PRODUCTOS ── */}
      <FlatList
        data={prodsFiltrados}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item: prod }) => {
          const enCarrito = carrito.find(i => i.productoId === prod.id);
          return (
            <TouchableOpacity
              style={[styles.prodCard, enCarrito && styles.prodCardActive]}
              onPress={() => agregarItem(prod)}
              activeOpacity={0.8}
            >
              <Text style={styles.prodEmoji}>{prod.emoji || '🍽️'}</Text>
              <Text style={styles.prodNombre} numberOfLines={2}>{prod.nombre}</Text>
              <Text style={styles.prodPrecio}>{formatPeso(Number(prod.precio))}</Text>
              {enCarrito && (
                <View style={styles.badgeCantidad}>
                  <Text style={styles.badgeCantidadText}>{enCarrito.cantidad}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyMenu}>
            <Text style={{ fontSize: 28 }}>🍽️</Text>
            <Text style={styles.emptyMenuText}>Sin productos en esta categoría</Text>
          </View>
        }
      />

      {/* ── BOTÓN FLOTANTE ENVIAR/CARRITO ── */}
      {carrito.length > 0 && (
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={styles.btnVerCarrito}
            onPress={() => setModalCarrito(true)}
          >
            <Text style={styles.btnVerCarritoText}>
              Ver pedido ({totalItems} ítems) · {formatPeso(total)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MODAL CARRITO + ENVÍO ── */}
      <Modal
        visible={modalCarrito}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalCarrito(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Revisar pedido</Text>
            <TouchableOpacity onPress={() => setModalCarrito(false)}>
              <Text style={styles.modalCerrar}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Info mesa */}
          <View style={styles.modalInfoBar}>
            {mesa ? (
              <View style={styles.mesaBadge}>
                <Text style={styles.mesaBadgeText}>Mesa {mesa}</Text>
              </View>
            ) : (
              <Text style={styles.sinMesa}>⚠ Sin mesa asignada</Text>
            )}
            <Text style={styles.clienteNombre}>
              {nombreCliente || 'Cliente sin nombre'}
            </Text>
          </View>

          {/* Items */}
          <ScrollView style={styles.modalItems}>
            {carrito.map(item => (
              <View key={item.productoId} style={styles.carritoRow}>
                <Text style={styles.carritoEmoji}>{item.emoji || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.carritoNombre}>{item.nombre}</Text>
                  <Text style={styles.carritoPrecioUnit}>{formatPeso(item.precio)} c/u</Text>
                </View>
                <View style={styles.cantidadCtrl}>
                  <TouchableOpacity
                    style={styles.ctrlBtn}
                    onPress={() => cambiarCantidad(item.productoId, -1)}
                  >
                    <Text style={styles.ctrlBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.cantidadNum}>{item.cantidad}</Text>
                  <TouchableOpacity
                    style={styles.ctrlBtn}
                    onPress={() => cambiarCantidad(item.productoId, 1)}
                  >
                    <Text style={styles.ctrlBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.carritoSubtotal}>
                  {formatPeso(item.precio * item.cantidad)}
                </Text>
              </View>
            ))}

            {/* Observaciones */}
            <View style={styles.obsContainer}>
              <Text style={styles.obsLabel}>OBSERVACIONES (opcional)</Text>
              <TextInput
                style={styles.obsInput}
                placeholder="Ej: sin cebolla, término medio..."
                placeholderTextColor="#8fa0b4"
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Total + botones */}
          <View style={styles.modalFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total del pedido</Text>
              <Text style={styles.totalMonto}>{formatPeso(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.btnEnviar, enviando && { opacity: 0.5 }]}
              onPress={enviar}
              disabled={enviando}
              activeOpacity={0.85}
            >
              {enviando
                ? <ActivityIndicator color="white" />
                : <Text style={styles.btnEnviarText}>📲 Enviar al cajero</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnLimpiar} onPress={limpiar}>
              <Text style={styles.btnLimpiarText}>Cancelar y limpiar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eceae5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#4a5e74', fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#0d1f38', marginBottom: 6 },
  errorDesc: { fontSize: 12, color: '#8fa0b4', marginBottom: 20 },
  btnReintentar: {
    backgroundColor: '#0d1f38', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  btnReintentarText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Header
  header: {
    backgroundColor: '#0d1f38', paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  btnCarritoHeader: {
    backgroundColor: '#f0c840', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  btnCarritoHeaderText: { fontSize: 13, fontWeight: '800', color: '#0d1f38' },

  // Info bar (mesa + cliente)
  infoBar: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: 'white', borderBottomWidth: 1.5, borderBottomColor: '#d8dfe8',
  },
  infoInput: {
    height: 40, backgroundColor: '#f7f5f2', borderWidth: 1.5, borderColor: '#d8dfe8',
    borderRadius: 8, paddingHorizontal: 12, fontSize: 13, color: '#111e2c', fontWeight: '600',
  },
  infoInputMesa: { width: 70 },

  // Categorías
  catBar: { backgroundColor: 'white', maxHeight: 50, flexGrow: 0 },
  catBarContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  catBtn: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#d8dfe8', backgroundColor: 'white',
  },
  catBtnActive: { backgroundColor: '#0d1f38', borderColor: '#0d1f38' },
  catText: { fontSize: 12, fontWeight: '700', color: '#4a5e74' },
  catTextActive: { color: 'white' },

  // Grid productos
  gridContent: { padding: 10, paddingBottom: 100 },
  gridRow: { gap: 10, marginBottom: 10 },
  prodCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 12,
    padding: 12, borderWidth: 1.5, borderColor: '#d8dfe8',
    alignItems: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  prodCardActive: { borderColor: '#16784a', backgroundColor: '#eaf7f1' },
  prodEmoji: { fontSize: 28, marginBottom: 6 },
  prodNombre: {
    fontSize: 12, fontWeight: '700', color: '#111e2c',
    textAlign: 'center', lineHeight: 16, marginBottom: 4,
  },
  prodPrecio: { fontSize: 13, fontWeight: '800', color: '#0d1f38' },
  badgeCantidad: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#0d1f38', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  badgeCantidadText: { color: '#f0c840', fontSize: 10, fontWeight: '800' },
  emptyMenu: { alignItems: 'center', padding: 40 },
  emptyMenuText: { fontSize: 12, color: '#8fa0b4', marginTop: 8 },

  // Footer bar
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, backgroundColor: 'white',
    borderTopWidth: 1.5, borderTopColor: '#d8dfe8',
  },
  btnVerCarrito: {
    backgroundColor: '#0d1f38', height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnVerCarritoText: { color: 'white', fontSize: 14, fontWeight: '800' },

  // Modal carrito
  modalContainer: { flex: 1, backgroundColor: '#f7f5f2' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, backgroundColor: 'white', borderBottomWidth: 1.5, borderBottomColor: '#d8dfe8',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0d1f38' },
  modalCerrar: { fontSize: 18, color: '#8fa0b4', fontWeight: '700', padding: 4 },
  modalInfoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f0f3f8',
  },
  mesaBadge: {
    backgroundColor: '#0d1f38', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  mesaBadgeText: { color: '#f0c840', fontSize: 12, fontWeight: '800' },
  sinMesa: { fontSize: 11, fontWeight: '700', color: '#c0351a' },
  clienteNombre: { fontSize: 13, fontWeight: '600', color: '#4a5e74' },
  modalItems: { flex: 1, padding: 12 },
  carritoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#f0f3f8',
  },
  carritoEmoji: { fontSize: 22 },
  carritoNombre: { fontSize: 13, fontWeight: '700', color: '#111e2c', marginBottom: 2 },
  carritoPrecioUnit: { fontSize: 11, color: '#8fa0b4' },
  cantidadCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f7f5f2',
    borderWidth: 1.5, borderColor: '#d8dfe8', alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnText: { fontSize: 16, fontWeight: '700', color: '#4a5e74' },
  cantidadNum: { fontSize: 14, fontWeight: '800', color: '#111e2c', minWidth: 16, textAlign: 'center' },
  carritoSubtotal: { fontSize: 13, fontWeight: '800', color: '#0d1f38', minWidth: 64, textAlign: 'right' },
  obsContainer: { marginTop: 8, marginBottom: 8 },
  obsLabel: {
    fontSize: 10, fontWeight: '800', color: '#8fa0b4',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  obsInput: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#d8dfe8',
    borderRadius: 10, padding: 12, fontSize: 13, color: '#111e2c',
    minHeight: 60, textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 16, backgroundColor: 'white',
    borderTopWidth: 1.5, borderTopColor: '#d8dfe8',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  totalLabel: { fontSize: 13, color: '#8fa0b4', fontWeight: '600' },
  totalMonto: { fontSize: 22, fontWeight: '800', color: '#0d1f38' },
  btnEnviar: {
    height: 52, backgroundColor: '#0d1f38', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  btnEnviarText: { color: 'white', fontSize: 15, fontWeight: '800' },
  btnLimpiar: {
    height: 40, alignItems: 'center', justifyContent: 'center',
  },
  btnLimpiarText: { color: '#c0351a', fontSize: 13, fontWeight: '700' },
});

export default NuevaOrdenScreen;
