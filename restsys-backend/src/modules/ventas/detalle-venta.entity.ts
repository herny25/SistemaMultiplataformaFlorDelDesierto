import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../productos/producto.entity';

@Entity('detalles_venta')
export class DetalleVenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cantidad: number;

  // Precio unitario al momento de la venta (puede diferir del precio actual)
  @Column({ type: 'int' })
  precioUnitario: number;

  // Subtotal = cantidad * precioUnitario
  @Column({ type: 'int' })
  subtotal: number;

  @Column({ type: 'text', nullable: true })
  notas: string; // Ej: "sin sal", "bien cocido"

  // Relación: este detalle pertenece a una venta
  @ManyToOne(() => Venta, (venta) => venta.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @Column()
  ventaId: number;

  // Relación: este detalle referencia un producto
  @ManyToOne(() => Producto, (producto) => producto.detallesVenta)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column()
  productoId: number;
}
