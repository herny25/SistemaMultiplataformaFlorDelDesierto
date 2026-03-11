import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/theme';

export default function TabsLayout() {
  const { garzon, cargando } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    if (garzon) {
      router.replace('/(tabs)/');
    } else {
      router.replace('/(tabs)/explore');
    }
  }, [garzon, cargando]);

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}
