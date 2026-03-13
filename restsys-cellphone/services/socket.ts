import { io, Socket } from 'socket.io-client';
import { getWsUrl } from './config';

let socket: Socket | null = null;

export const conectar = async (): Promise<Socket> => {
  if (socket?.connected) return socket;
  const url = await getWsUrl();
  socket = io(url, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const conectarComoGarzon = async (nombre: string): Promise<Socket> => {
  const s = await conectar();
  s.emit('unirse_sala', { sala: 'garzones', nombre });
  return s;
};

export const enviarOrden = async (orden: {
  nombreCliente: string; mesa: string; garzon: string;
  items: { productoId: number; cantidad: number }[];
  observaciones?: string;
  tipoCliente?: string;
  empleadoId?: number;
  empresaNombre?: string;
  comandaLineas?: { cantidad: number; nombre: string; agregados?: string[] }[];
}) => {
  const s = getSocket();
  if (!s?.connected) throw new Error('Sin conexión al servidor');
  s.emit('enviar_orden', orden);
};

export const WS_EVENTS = {
  CONNECT: 'connect', DISCONNECT: 'disconnect', CONNECT_ERROR: 'connect_error',
  PRODUCTO_AGOTADO: 'producto_agotado',
};