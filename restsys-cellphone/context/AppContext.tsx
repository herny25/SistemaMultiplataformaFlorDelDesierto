import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { conectarComoGarzon, WS_EVENTS } from '@/services/socket';

interface AppContextType {
  garzon: string | null;
  setGarzon: (nombre: string) => void;
  cerrarSesion: () => void;
  cargando: boolean;
  conectado: boolean;
  productoAgotado: { id: number; nombre: string } | null;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [garzon, setGarzonState] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [conectado, setConectado] = useState(false);
  const [productoAgotado, setProductoAgotado] = useState<{ id: number; nombre: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('garzon_nombre').then(nombre => {
      if (nombre) setGarzonState(nombre);
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    if (!garzon) return;
    let mounted = true;
    conectarComoGarzon().then(socket => {
      if (!mounted) return;
      socket.on(WS_EVENTS.CONNECT, () => mounted && setConectado(true));
      socket.on(WS_EVENTS.DISCONNECT, () => mounted && setConectado(false));
      socket.on(WS_EVENTS.CONNECT_ERROR, () => mounted && setConectado(false));
      socket.on(WS_EVENTS.PRODUCTO_AGOTADO, (data: { productoId: number; nombreProducto: string }) => {
        if (mounted) {
          setProductoAgotado({ id: data.productoId, nombre: data.nombreProducto });
          setTimeout(() => mounted && setProductoAgotado(null), 5000);
        }
      });
      if (socket.connected) setConectado(true);
    });
    return () => { mounted = false; };
  }, [garzon]);

  const setGarzon = async (nombre: string) => {
    await AsyncStorage.setItem('garzon_nombre', nombre);
    setGarzonState(nombre);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.removeItem('garzon_nombre');
    setGarzonState(null);
  };

  return (
    <AppContext.Provider value={{ garzon, setGarzon, cerrarSesion, cargando, conectado, productoAgotado }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);