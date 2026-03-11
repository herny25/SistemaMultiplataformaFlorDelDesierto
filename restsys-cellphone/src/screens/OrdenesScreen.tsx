import React from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import type { OrdenEnviada } from '../types';
import { formatPeso } from '../utils/format';

interface Props {
  ordenes: OrdenEnviada[];
  nombreGarzon: string;
  onDesconectar: () => void;
}

const OrdenesScreen: React.FC<Props> = ({ ordenes, nombreGarzon, onDesconectar }) => {
  const totalTurno = ordenes
    .filter(o => o.estado !== 'procesada')
    .reduce((acc, o) => acc + o.total, 0);

  const renderOrden = ({ item }: { item: OrdenEnviada }) => (
    <View style={[styles.card, item.estado === 'procesada' && styles.cardProcesada]}>
      <View style={styles.cardHeader}>
        <View style={styles.mesaBadge}>
          <Text style={styles.mesaBadgeText}>Mesa {item.mesa}</Text>
        </View>
        <Text style={styles.cardCliente}>{item.nombreCliente}</Text>
        <Text style={styles.cardHora}>{item.hora}</Text>
      </View>

      <View style={styles.itemsList}>
        {item.items.map((i, idx) => (
          <Text key={idx} style={styles.itemText}>
            {i.emoji || '•'} {i.cantidad}× {i.nombre}
            <Text style={styles.itemPrecio}> {formatPeso(i.precio * i.cantidad)}</Text>
          </Text>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View style={[
          styles.estadoBadge,
          item.estado === 'procesada' ? styles.estadoProcesada : styles.estadoEnviada,
        ]}>
          <Text style={[
            styles.estadoText,
            item.estado === 'procesada' ? styles.estadoProcesadaText : styles.estadoEnviadaText,
          ]}>
            {item.estado === 'procesada' ? '✓ Cobrado' : '⏳ Enviado'}
          </Text>
        </View>
        <Text style={styles.totalOrden}>{formatPeso(item.total)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1f38" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Órdenes</Text>
          <Text style={styles.headerSub}>Garzón: {nombreGarzon}</Text>
        </View>
        <TouchableOpacity style={styles.btnDesconectar} onPress={onDesconectar}>
          <Text style={styles.btnDesconectarText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen del turno */}
      {ordenes.length > 0 && (
        <View style={styles.resumenBar}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenNum}>{ordenes.length}</Text>
            <Text style={styles.resumenLabel}>órdenes</Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <Text style={styles.resumenNum}>
              {ordenes.filter(o => o.estado === 'procesada').length}
            </Text>
            <Text style={styles.resumenLabel}>cobradas</Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <Text style={[styles.resumenNum, { color: '#f0c840' }]}>
              {formatPeso(totalTurno)}
            </Text>
            <Text style={styles.resumenLabel}>pendiente cobro</Text>
          </View>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={[...ordenes].reverse()} // Más reciente primero
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderOrden}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIco}>📋</Text>
            <Text style={styles.emptyTitle}>Sin órdenes aún</Text>
            <Text style={styles.emptyDesc}>
              Las órdenes que envíes aparecerán aquí durante el turno.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eceae5' },
  header: {
    backgroundColor: '#0d1f38', paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  btnDesconectar: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  btnDesconectarText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  resumenBar: {
    backgroundColor: '#163054', flexDirection: 'row',
    paddingVertical: 10, paddingHorizontal: 18,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 16, fontWeight: '800', color: 'white' },
  resumenLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  resumenDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  listContent: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#d8dfe8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardProcesada: { opacity: 0.65, backgroundColor: '#f7f5f2' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  mesaBadge: {
    backgroundColor: '#0d1f38', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  mesaBadgeText: { color: '#f0c840', fontSize: 11, fontWeight: '800' },
  cardCliente: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111e2c' },
  cardHora: { fontSize: 11, color: '#8fa0b4', fontWeight: '600' },
  itemsList: { marginBottom: 10 },
  itemText: { fontSize: 12, color: '#4a5e74', lineHeight: 20, fontWeight: '500' },
  itemPrecio: { color: '#0d1f38', fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f0f3f8',
  },
  estadoBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  estadoEnviada: { backgroundColor: '#fef3e5' },
  estadoProcesada: { backgroundColor: '#eaf7f1' },
  estadoText: { fontSize: 11, fontWeight: '800' },
  estadoEnviadaText: { color: '#b86010' },
  estadoProcesadaText: { color: '#16784a' },
  totalOrden: { fontSize: 16, fontWeight: '800', color: '#0d1f38' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIco: { fontSize: 42, marginBottom: 12, opacity: 0.3 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0d1f38', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#8fa0b4', textAlign: 'center', lineHeight: 18 },
});

export default OrdenesScreen;
