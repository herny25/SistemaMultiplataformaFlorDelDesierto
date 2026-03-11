import {
  Column, Entity, OneToMany,
  PrimaryGeneratedColumn, CreateDateColumn,
} from 'typeorm';
import { Venta } from '../../ventas/entities/venta.entity';

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Entity('cajas_diarias')
export class CajaDiaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'enum', enum: EstadoCaja, default: EstadoCaja.ABIERTA })
  estado: EstadoCaja;

  // Monto inicial declarado al abrir la caja
  @Column({ type: 'decimal', precision: 10, scale: 0 })
  montoInicial: number;

  // Ventas del día por método de pago
  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalEfectivo: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalTarjeta: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalTransferencia: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalPensionados: number; // Ventas a cuenta (no cobradas hoy)

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalGeneral: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalPropinas: number;

  // Conteo real de efectivo al cerrar
  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  montoContado: number;

  // Diferencia: montoContado - (montoInicial + totalEfectivo)
  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  diferencia: number;

  @Column({ nullable: true })
  observaciones: string;

  @CreateDateColumn()
  abiertoEn: Date;

  @Column({ nullable: true })
  cerradoEn: Date;

  @OneToMany(() => Venta, (venta) => venta.caja)
  ventas: Venta[];
}
