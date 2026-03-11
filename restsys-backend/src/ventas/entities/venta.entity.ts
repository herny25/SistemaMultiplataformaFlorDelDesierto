import {
  Column, Entity, OneToMany, ManyToOne,
  PrimaryGeneratedColumn, CreateDateColumn, JoinColumn,
} from 'typeorm';
import { ItemVenta } from './item-venta.entity';
import { Empleado } from '../../pensionados/entities/empleado.entity';
import { CajaDiaria } from '../../caja/entities/caja-diaria.entity';

export enum TipoCliente {
  PENSIONADO = 'PENSIONADO',
  PARTICULAR = 'PARTICULAR',
  PARTICULAR_FACTURA = 'PARTICULAR_FACTURA',
  PERSONAL = 'PERSONAL',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CUENTA = 'CUENTA', // Para pensionados (pago diferido)
}

export enum EstadoVenta {
  PENDIENTE   = 'PENDIENTE',    // Orden recibida del garzón
  PROCESADA   = 'PROCESADA',    // Cobrada / registrada
  ANULADA     = 'ANULADA',      // Cancelada / no válida
  REEMBOLSADA = 'REEMBOLSADA',  // Se devolvió el dinero al cliente
  DEVUELTA    = 'DEVUELTA',     // El pedido fue devuelto (plato/servicio)
}

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoCliente })
  tipoCliente: TipoCliente;

  @Column({ type: 'enum', enum: MetodoPago, nullable: true })
  metodoPago: MetodoPago;

  @Column({ type: 'enum', enum: EstadoVenta, default: EstadoVenta.PENDIENTE })
  estado: EstadoVenta;

  // Nombre libre (para particulares o personal)
  @Column({ nullable: true })
  nombreCliente: string;

  // Mesa donde se atendió
  @Column({ nullable: true })
  mesa: string;

  // RUT para PARTICULAR_FACTURA
  @Column({ nullable: true })
  rutFactura: string;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  total: number;

  // Monto recibido en efectivo (para calcular vuelto)
  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  montoRecibido: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  vuelto: number;

  // Propina voluntaria del cliente (no afecta el total de la venta)
  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  propina: number;

  @Column({ nullable: true })
  observaciones: string;

  // Referencia al garzón que tomó el pedido (nombre libre, no entidad)
  @Column({ nullable: true })
  garzon: string;

  @CreateDateColumn()
  creadaEn: Date;

  @Column({ nullable: true })
  procesadaEn: Date;

  // Relación con empleado (solo para PENSIONADO)
  @ManyToOne(() => Empleado, { nullable: true, eager: false })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ nullable: true })
  empleadoId: number;

  // Relación con el período de facturación (solo para PENSIONADO)
  @Column({ nullable: true })
  periodoFacturacionId: number;

  // Caja diaria a la que pertenece esta venta
  @ManyToOne(() => CajaDiaria, (caja) => caja.ventas, { nullable: true })
  @JoinColumn({ name: 'cajaId' })
  caja: CajaDiaria;

  @Column({ nullable: true })
  cajaId: number;

  @OneToMany(() => ItemVenta, (item) => item.venta, { cascade: true, eager: true })
  items: ItemVenta[];
}
