import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Empleado } from './empleado.entity';
import { PeriodoFacturacion } from './periodo-facturacion.entity';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 12, unique: true })
  rut: string; // Ej: "76.123.456-7"

  @Column({ length: 100, nullable: true })
  contactoNombre: string;

  @Column({ length: 20, nullable: true })
  contactoTelefono: string;

  @Column({ length: 100, nullable: true })
  contactoEmail: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;

  // Relación: una empresa tiene muchos empleados pensionados
  @OneToMany(() => Empleado, (empleado) => empleado.empresa)
  empleados: Empleado[];

  // Relación: una empresa tiene muchos períodos de facturación
  @OneToMany(() => PeriodoFacturacion, (periodo) => periodo.empresa)
  periodosFacturacion: PeriodoFacturacion[];
}
