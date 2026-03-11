import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { Empresa } from './empresa.entity';
import { Venta } from '../ventas/venta.entity';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 12, unique: true })
  rut: string; // Ej: "12.345.678-9"

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;

  // Relación: un empleado pertenece a una empresa
  @ManyToOne(() => Empresa, (empresa) => empresa.empleados)
  @JoinColumn({ name: 'empresaId' })
  empresa: Empresa;

  @Column()
  empresaId: number;

  // Relación: un empleado puede tener muchas ventas (consumos)
  @OneToMany(() => Venta, (venta) => venta.empleado)
  ventas: Venta[];
}
