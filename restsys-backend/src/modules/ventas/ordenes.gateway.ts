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

/**
 * Gateway de WebSockets para comunicación en tiempo real.
 * 
 * Eventos que RECIBE el servidor:
 * - 'nueva-orden': Un garzón envía una nueva orden desde su app Flutter
 * - 'orden-lista': El cajero marca una orden como lista/preparada
 * 
 * Eventos que EMITE el servidor:
 * - 'orden-recibida': Confirma al garzón que la orden fue recibida
 * - 'nueva-orden-cajero': Avisa al cajero que llegó una nueva orden
 * - 'orden-actualizada': Avisa a todos los garzones sobre cambios en una orden
 */
@WebSocketGateway({
  cors: {
    origin: '*', // En producción, cambiar por las IPs de los dispositivos
  },
})
export class OrdenesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Mapa para saber qué cliente es cajero vs garzón
  private cajeros: Set<string> = new Set();
  private garzones: Map<string, string> = new Map(); // socketId -> nombreGarzon

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    this.cajeros.delete(client.id);
    this.garzones.delete(client.id);
  }

  // El cajero se registra para recibir órdenes
  @SubscribeMessage('registrar-cajero')
  handleRegistrarCajero(@ConnectedSocket() client: Socket) {
    this.cajeros.add(client.id);
    client.emit('registrado', { rol: 'cajero', mensaje: 'Conectado como cajero' });
    console.log(`Cajero registrado: ${client.id}`);
  }

  // Un garzón se registra con su nombre
  @SubscribeMessage('registrar-garzon')
  handleRegistrarGarzon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { nombre: string },
  ) {
    this.garzones.set(client.id, data.nombre);
    client.emit('registrado', { rol: 'garzon', nombre: data.nombre });
    console.log(`Garzón registrado: ${data.nombre} (${client.id})`);
  }

  // El garzón envía una nueva orden
  @SubscribeMessage('nueva-orden')
  handleNuevaOrden(
    @ConnectedSocket() client: Socket,
    @MessageBody() orden: {
      nombreCliente: string;
      mesa: string;
      productos: Array<{ productoId: number; nombre: string; cantidad: number; notas?: string }>;
      notas?: string;
    },
  ) {
    const nombreGarzon = this.garzones.get(client.id) || 'Garzón desconocido';
    
    // Agregar metadata a la orden
    const ordenCompleta = {
      ...orden,
      garzon: nombreGarzon,
      socketGarzonId: client.id,
      timestamp: new Date().toISOString(),
    };

    console.log(`Nueva orden de ${nombreGarzon}:`, ordenCompleta);

    // Confirmar recepción al garzón
    client.emit('orden-recibida', {
      mensaje: 'Orden enviada al cajero',
      timestamp: ordenCompleta.timestamp,
    });

    // Enviar la orden a todos los cajeros conectados
    this.cajeros.forEach((cajeroId) => {
      this.server.to(cajeroId).emit('nueva-orden-cajero', ordenCompleta);
    });
  }

  // El cajero marca una orden como procesada
  @SubscribeMessage('orden-procesada')
  handleOrdenProcesada(
    @MessageBody() data: { ventaId: number; mesa: string; socketGarzonId: string },
  ) {
    // Avisar al garzón específico que su orden fue procesada
    if (data.socketGarzonId) {
      this.server.to(data.socketGarzonId).emit('tu-orden-procesada', {
        ventaId: data.ventaId,
        mesa: data.mesa,
        mensaje: 'Tu orden fue procesada por el cajero',
      });
    }

    // Avisar a todos los garzones sobre el estado
    this.server.emit('orden-actualizada', {
      ventaId: data.ventaId,
      estado: 'procesada',
    });
  }

  // Método para emitir desde otros servicios (ej: cuando se crea una venta)
  emitirNuevaVenta(venta: any) {
    this.server.emit('venta-creada', venta);
  }
}
