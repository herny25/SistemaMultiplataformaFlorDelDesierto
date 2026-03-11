import { Column, Entity, OneToMany, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Empleado } from './empleado.entity';
import { PeriodoFacturacion } from './periodo-facturacion.entity';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  rut: string;

  @Column({ nullable: true })
  contacto: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  creadaEn: Date;

  @OneToMany(() => Empleado, (emp) => emp.empresa)
  empleados: Empleado[];

  @OneToMany(() => PeriodoFacturacion, (p) => p.empresa)
  periodos: PeriodoFacturacion[];
}
