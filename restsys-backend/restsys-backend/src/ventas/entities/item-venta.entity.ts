import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../inventario/entities/producto.entity';

@Entity('items_venta')
export class ItemVenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  precioUnitario: number; // Precio al momento de la venta (histórico)

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  subtotal: number;

  @Column()
  nombreProducto: string; // Copia del nombre (histórico)

  @ManyToOne(() => Venta, (venta) => venta.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @Column()
  ventaId: number;

  @ManyToOne(() => Producto, { nullable: true, eager: true })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ nullable: true })
  productoId: number;
}
