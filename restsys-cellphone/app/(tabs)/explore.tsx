import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { getSavedIp, saveServerIp } from '@/services/config';
import { COLORS, RADIUS, SHADOW } from '@/constants/theme';

export default function LoginScreen() {
  const { setGarzon } = useApp();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [ip, setIp] = useState('');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getSavedIp().then(setIp);
  }, []);

  useFocusEffect(useCallback(() => {
    setGuardando(false);
    setNombre('');
    setContrasena('');
  }, []));

  const ingresar = async () => {
    if (!nombre.trim() || !contrasena.trim()) return;
    setGuardando(true);
    try {
      if (ip.trim()) await saveServerIp(ip.trim());
      // Verify credentials via API
      const { loginApi } = await import('@/services/api');
      await loginApi(nombre.trim(), contrasena.trim());
      await setGarzon(nombre.trim());
      router.replace('/(tabs)/');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Usuario o contraseña incorrectos');
    }
    setGuardando(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fondo decorativo */}
      <View style={styles.bgDecor} />

      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>RestSys</Text>
          <View style={styles.logoDot} />
        </View>
        <Text style={styles.subtitle}>Aplicación del garzón</Text>

        <View style={styles.divider} />

        {/* Input nombre */}
        <Text style={styles.label}>¿CÓMO TE LLAMAS?</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={COLORS.text3}
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Input contraseña */}
        <Text style={styles.label}>CONTRASEÑA</Text>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={COLORS.text3}
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={ingresar}
        />

        {/* Botón ingresar */}
        <TouchableOpacity
          style={[styles.btnPrimary, (!nombre.trim() || !contrasena.trim()) && styles.btnDisabled]}
          onPress={ingresar}
          disabled={!nombre.trim() || !contrasena.trim() || guardando}
          activeOpacity={0.85}
        >
          {guardando
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnPrimaryText}>Ingresar →</Text>
          }
        </TouchableOpacity>

        {/* Config servidor */}
        <TouchableOpacity
          onPress={() => setMostrarConfig(!mostrarConfig)}
          style={styles.configToggle}
        >
          <Text style={styles.configToggleText}>
            {mostrarConfig ? '▲' : '▼'} Configurar IP del servidor
          </Text>
        </TouchableOpacity>

        {mostrarConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configNote}>
              Ingresa la IP local de la laptop del cajero (mismo WiFi).{'\n'}
              En Linux ejecuta: <Text style={styles.mono}>hostname -I{'\n'}</Text>
              En Windows ejecuta: <Text style={styles.mono}>ipconfig</Text>
            </Text>
            <TextInput
              style={styles.inputSmall}
              placeholder="192.168.1.100"
              placeholderTextColor={COLORS.text3}
              value={ip}
              onChangeText={setIp}
              keyboardType="decimal-pad"
              autoCapitalize="none"
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.navy,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  bgDecor: {
    position: 'absolute', top: -80, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(240,200,64,0.06)',
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: 28,
    ...SHADOW.md,
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  logoText: {
    fontSize: 26, fontWeight: '700', color: COLORS.navy,
    fontStyle: 'italic',
  },
  logoDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c97a',
    shadowColor: '#22c97a', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  subtitle: {
    fontSize: 12, color: COLORS.text3, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  divider: {
    height: 1.5, backgroundColor: COLORS.border,
    marginVertical: 22,
  },
  label: {
    fontSize: 10, fontWeight: '800', color: COLORS.text3,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    height: 48, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: 14,
    fontSize: 15, fontWeight: '600', color: COLORS.text,
    backgroundColor: COLORS.surface2, marginBottom: 16,
  },
  btnPrimary: {
    height: 50, backgroundColor: COLORS.navy, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  btnDisabled: { opacity: 0.35 },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  configToggle: { alignItems: 'center', paddingVertical: 4 },
  configToggleText: { fontSize: 11.5, color: COLORS.text3, fontWeight: '600' },
  configBox: {
    marginTop: 10, backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  configNote: {
    fontSize: 11, color: COLORS.text2, lineHeight: 17, marginBottom: 10,
  },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.navy },
  inputSmall: {
    height: 40, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: 12,
    fontSize: 13, fontWeight: '600', color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
});
