import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
};

export const conectarComoCajero = () => {
  const s = getSocket();
  s.emit('unirse_sala', 'cajero');
  return s;
};

export const desconectar = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const WS_EVENTS = {
  NUEVA_ORDEN_GARZON: 'nueva_orden_garzon',
  NUEVA_VENTA: 'nueva_venta',
  ORDEN_PROCESADA: 'orden_procesada',
  PRODUCTO_AGOTADO: 'producto_agotado',
  ORDENES_PENDIENTES: 'ordenes_pendientes',
};
