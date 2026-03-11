import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Empresa } from './empresa.entity';

export enum EstadoPeriodo {
  PENDIENTE = 'PENDIENTE',   // Generado pero no facturado
  FACTURADO = 'FACTURADO',   // Factura emitida al cliente
  PAGADO = 'PAGADO',         // Empresa pagó la factura
}

@Entity('periodos_facturacion')
export class PeriodoFacturacion {
  @PrimaryGeneratedColumn()
  id: number;

  // Mes al que corresponde (1-12)
  @Column({ type: 'int' })
  mes: number;

  @Column({ type: 'int' })
  anio: number;

  // Total acumulado de consumos del período
  @Column({ type: 'int', default: 0 })
  totalConsumos: number;

  @Column({
    type: 'enum',
    enum: EstadoPeriodo,
    default: EstadoPeriodo.PENDIENTE,
  })
  estado: EstadoPeriodo;

  @Column({ type: 'date', nullable: true })
  fechaFactura: Date;

  @Column({ type: 'date', nullable: true })
  fechaPago: Date;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  creadoEn: Date;

  @ManyToOne(() => Empresa, (empresa) => empresa.periodosFacturacion)
  @JoinColumn({ name: 'empresaId' })
  empresa: Empresa;

  @Column()
  empresaId: number;
}
