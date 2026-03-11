import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn } from 'typeorm';
import { Empresa } from './empresa.entity';

export enum EstadoPeriodo {
  PENDIENTE = 'PENDIENTE',
  FACTURADO = 'FACTURADO',
  PAGADO = 'PAGADO',
}

@Entity('periodos_facturacion')
export class PeriodoFacturacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mes: number; // 1-12

  @Column()
  anio: number; // ej: 2026

  @Column({ type: 'enum', enum: EstadoPeriodo, default: EstadoPeriodo.PENDIENTE })
  estado: EstadoPeriodo;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalMonto: number; // Calculado al cerrar el período

  @Column({ nullable: true })
  fechaFacturado: Date;

  @Column({ nullable: true })
  fechaPagado: Date;

  @Column({ nullable: true })
  observaciones: string;

  @CreateDateColumn()
  creadoEn: Date;

  @ManyToOne(() => Empresa, (emp) => emp.periodos)
  @JoinColumn({ name: 'empresaId' })
  empresa: Empresa;

  @Column()
  empresaId: number;
}
