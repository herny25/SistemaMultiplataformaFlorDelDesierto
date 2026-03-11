import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// Eventos emitidos por el SERVIDOR hacia los clientes
export const WS_EVENTS = {
  NUEVA_VENTA: 'nueva_venta',          // Cajero recibe venta procesada
  NUEVA_ORDEN_GARZON: 'nueva_orden_garzon', // Cajero recibe orden del garzón
  ORDEN_PROCESADA: 'orden_procesada',  // Garzón recibe confirmación de su orden
  ESTADO_CAJA: 'estado_caja',          // Broadcast del estado de la caja
  PRODUCTO_AGOTADO: 'producto_agotado', // Notificar a garzones que un producto se agotó
};

// Eventos recibidos desde los CLIENTES
export const WS_MESSAGES = {
  ENVIAR_ORDEN: 'enviar_orden',    // Garzón → servidor: nueva orden
  UNIRSE_SALA: 'unirse_sala',      // Cliente → servidor: identificarse (cajero/garzon)
};

export interface OrdenGarzon {
  nombreCliente: string;
  mesa: string;
  garzon: string;
  items: Array<{ productoId: number; cantidad: number }>;
  observaciones?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // En producción limitar al IP del frontend
  },
})
export class OrdenesgGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WebSocket');
  private ordenesEnEspera: OrdenGarzon[] = [];

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // El garzón se une a su sala y el cajero a la suya
  @SubscribeMessage(WS_MESSAGES.UNIRSE_SALA)
  handleUnirse(@ConnectedSocket() client: Socket, @MessageBody() sala: string) {
    client.join(sala); // Salas: 'cajero', 'garzones'
    this.logger.log(`Cliente ${client.id} se unió a sala: ${sala}`);

    // Si es el cajero, enviarle las órdenes pendientes
    if (sala === 'cajero' && this.ordenesEnEspera.length > 0) {
      client.emit('ordenes_pendientes', this.ordenesEnEspera);
    }
  }

  // El garzón envía una orden al cajero
  @SubscribeMessage(WS_MESSAGES.ENVIAR_ORDEN)
  handleNuevaOrden(@ConnectedSocket() client: Socket, @MessageBody() orden: OrdenGarzon) {
    this.logger.log(`Nueva orden del garzón ${orden.garzon} - Mesa ${orden.mesa}`);

    // Guardar en cola temporal
    this.ordenesEnEspera.push(orden);

    // Notificar al cajero
    this.server.to('cajero').emit(WS_EVENTS.NUEVA_ORDEN_GARZON, orden);

    // Confirmar al garzón que la orden fue recibida
    client.emit('orden_recibida', { status: 'ok', mesa: orden.mesa });
  }

  // Llamado por VentasService al procesar una venta
  notificarNuevaVenta(venta: any) {
    this.server.to('cajero').emit(WS_EVENTS.NUEVA_VENTA, venta);
    // Limpiar de la cola si era orden del garzón
    this.ordenesEnEspera = this.ordenesEnEspera.filter(
      (o) => o.mesa !== venta.mesa,
    );
  }

  // Notificar a los garzones que una orden fue procesada
  notificarOrdenProcesada(mesa: string, ventaId: number) {
    this.server.to('garzones').emit(WS_EVENTS.ORDEN_PROCESADA, { mesa, ventaId });
  }

  // Notificar a los garzones que un producto se agotó
  notificarProductoAgotado(productoId: number, nombreProducto: string) {
    this.server.emit(WS_EVENTS.PRODUCTO_AGOTADO, { productoId, nombreProducto });
  }
}
