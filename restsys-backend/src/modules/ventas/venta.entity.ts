import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, JoinColumn
} from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';
import { Empleado } from '../pensionados/empleado.entity';
import { CajaDiaria } from '../caja/caja-diaria.entity';

export enum TipoCliente {
  PENSIONADO = 'PENSIONADO',         // Empleado de empresa con convenio
  PARTICULAR_CONTADO = 'PARTICULAR_CONTADO', // Paga en efectivo/tarjeta
  PARTICULAR_FACTURA = 'PARTICULAR_FACTURA', // Necesita factura con RUT
  PERSONAL = 'PERSONAL',             // Consumo interno del restaurante
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CUENTA_EMPRESA = 'CUENTA_EMPRESA', // Para pensionados
  SIN_COBRO = 'SIN_COBRO',          // Para personal
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',   // Orden recibida del garzón, sin cobrar
  PAGADA = 'PAGADA',         // Cobrada y cerrada
  ANULADA = 'ANULADA',       // Cancelada
}

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TipoCliente,
    default: TipoCliente.PARTICULAR_CONTADO,
  })
  tipoCliente: TipoCliente;

  // Solo para particulares con factura: RUT del cliente
  @Column({ length: 12, nullable: true })
  rutCliente: string;

  // Nombre del cliente (obligatorio para pensionados, opcional para otros)
  @Column({ length: 100, nullable: true })
  nombreCliente: string;

  // Número de mesa (puede ser null si es para llevar)
  @Column({ length: 20, nullable: true })
  mesa: string;

  @Column({
    type: 'enum',
    enum: MetodoPago,
    nullable: true,
  })
  metodoPago: MetodoPago;

  // Total calculado a partir de los detalles
  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.PENDIENTE,
  })
  estado: EstadoVenta;

  // Si es pensionado, referencia al empleado
  @ManyToOne(() => Empleado, (empleado) => empleado.ventas, { nullable: true })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ nullable: true })
  empleadoId: number;

  // Referencia a la caja del día en que se realizó la venta
  @ManyToOne(() => CajaDiaria, (caja) => caja.ventas, { nullable: true })
  @JoinColumn({ name: 'cajaId' })
  caja: CajaDiaria;

  @Column({ nullable: true })
  cajaId: number;

  // Nombre del garzón que tomó el pedido
  @Column({ length: 100, nullable: true })
  garzon: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  creadoEn: Date;

  // Relación: una venta tiene muchos ítems (detalles)
  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta, { cascade: true })
  detalles: DetalleVenta[];
}
