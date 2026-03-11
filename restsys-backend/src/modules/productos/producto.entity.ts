import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DetalleVenta } from '../ventas/detalle-venta.entity';

export enum CategoriaProducto {
  ENTRADA = 'ENTRADA',
  PLATO_PRINCIPAL = 'PLATO_PRINCIPAL',
  POSTRE = 'POSTRE',
  BEBIDA = 'BEBIDA',
  OTRO = 'OTRO',
}

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  // Precio en pesos chilenos (entero, sin decimales)
  @Column({ type: 'int' })
  precio: number;

  @Column({
    type: 'enum',
    enum: CategoriaProducto,
    default: CategoriaProducto.PLATO_PRINCIPAL,
  })
  categoria: CategoriaProducto;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  // Relación: un producto puede aparecer en muchos detalles de venta
  @OneToMany(() => DetalleVenta, (detalle) => detalle.producto)
  detallesVenta: DetalleVenta[];
}
