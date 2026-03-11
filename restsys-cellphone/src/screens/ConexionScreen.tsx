import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testConexion, setServerUrl } from '../services/api';
import { conectar } from '../services/socket';
import { COLORS, FONTS } from '../utils/theme';

interface Props {
  onConectado: (ip: string, nombre: string) => void;
}

const ConexionScreen: React.FC<Props> = ({ onConectado }) => {
  const [ip, setIp] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Cargar configuración guardada
  useEffect(() => {
    AsyncStorage.multiGet(['serverIp', 'nombreGarzon']).then(values => {
      const savedIp = values[0][1];
      const savedNombre = values[1][1];
      if (savedIp) setIp(savedIp);
      if (savedNombre) setNombre(savedNombre);
    });
  }, []);

  const conectar_ = async () => {
    if (!ip.trim()) { setError('Ingresa la IP del servidor'); return; }
    if (!nombre.trim()) { setError('Ingresa tu nombre'); return; }
    setError('');
    setCargando(true);

    try {
      // 1. Verificar que el servidor responde
      const ok = await testConexion(ip.trim());
      if (!ok) {
        setError('No se encontró el servidor en esa IP.\nVerifica que el backend esté corriendo y que ambos dispositivos estén en la misma red Wi-Fi.');
        return;
      }

      // 2. Conectar WebSocket
      setServerUrl(ip.trim());
      await conectar(ip.trim());

      // 3. Guardar para próxima vez
      await AsyncStorage.multiSet([
        ['serverIp', ip.trim()],
        ['nombreGarzon', nombre.trim()],
      ]);

      onConectado(ip.trim(), nombre.trim());
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>RestSys</Text>
          <Text style={styles.logoSub}>App del Garzón</Text>
        </View>

        {/* Card de conexión */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conectarse al sistema</Text>
          <Text style={styles.cardDesc}>
            Asegúrate de estar conectado a la misma red Wi-Fi que la laptop del cajero.
          </Text>

          <Text style={styles.label}>IP del servidor (laptop cajero)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 192.168.1.100"
            placeholderTextColor="#8fa0b4"
            value={ip}
            onChangeText={setIp}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Tu nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Carlos"
            placeholderTextColor="#8fa0b4"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btnConectar, cargando && styles.btnDisabled]}
            onPress={conectar_}
            disabled={cargando}
            activeOpacity={0.85}
          >
            {cargando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Conectar →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Ayuda */}
        <View style={styles.ayuda}>
          <Text style={styles.ayudaTitulo}>¿Cómo encontrar la IP?</Text>
          <Text style={styles.ayudaTexto}>
            En la laptop del cajero, abre una terminal y escribe:{'\n'}
            <Text style={styles.ayudaCodigo}>ip addr show | grep "inet "</Text>
            {'\n'}La IP comienza con 192.168.x.x
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1f38',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f0c840',
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0d1f38',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#8fa0b4',
    lineHeight: 18,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4a5e74',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: '#f7f5f2',
    borderWidth: 1.5,
    borderColor: '#d8dfe8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111e2c',
    fontWeight: '600',
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f4a99a',
  },
  errorText: {
    color: '#c0351a',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  btnConectar: {
    height: 50,
    backgroundColor: '#0d1f38',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  ayuda: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 16,
  },
  ayudaTitulo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  ayudaTexto: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    lineHeight: 18,
  },
  ayudaCodigo: {
    color: '#f0c840',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
  },
});

export default ConexionScreen;
