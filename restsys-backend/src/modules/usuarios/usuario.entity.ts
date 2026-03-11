import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum RolUsuario {
  CAJERO = 'CAJERO',
  GARZON = 'GARZON',
  ADMIN = 'ADMIN',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50, unique: true })
  usuario: string; // nombre de usuario para login

  @Column()
  password: string; // En producción, usar bcrypt para hashear

  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.GARZON,
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
