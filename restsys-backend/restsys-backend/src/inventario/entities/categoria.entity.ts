import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  emoji: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}
