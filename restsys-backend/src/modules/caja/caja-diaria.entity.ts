import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Venta } from '../ventas/venta.entity';

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

  // Monto con que se abre la caja (dinero inicial en caja)
  @Column({ type: 'int', default: 0 })
  montoInicial: number;

  // Monto contado al cierre (ingresado manualmente por cajero)
  @Column({ type: 'int', nullable: true })
  montoFinalContado: number;

  // Total calculado por el sistema (suma de ventas en efectivo)
  @Column({ type: 'int', nullable: true })
  montoFinalSistema: number;

  // Diferencia = montoFinalContado - montoFinalSistema
  @Column({ type: 'int', nullable: true })
  diferencia: number;

  @Column({
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.ABIERTA,
  })
  estado: EstadoCaja;

  @Column({ type: 'timestamp', nullable: true })
  fechaApertura: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaCierre: Date;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  creadoEn: Date;

  // Relación: una caja tiene muchas ventas del día
  @OneToMany(() => Venta, (venta) => venta.caja)
  ventas: Venta[];
}
