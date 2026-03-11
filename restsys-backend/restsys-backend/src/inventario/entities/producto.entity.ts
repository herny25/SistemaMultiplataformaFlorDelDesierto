import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Categoria } from './categoria.entity';

export enum TipoMenu {
  DESAYUNO = 'DESAYUNO',
  ALMUERZO = 'ALMUERZO',
  CENA = 'CENA',
  COLACION = 'COLACION',
  BEBIDA = 'BEBIDA',
  OTRO = 'OTRO',
}

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  precio: number;

  @Column({ nullable: true })
  emoji: string;

  @Column({ type: 'enum', enum: TipoMenu, default: TipoMenu.ALMUERZO })
  tipoMenu: TipoMenu;

  @Column({ default: true })
  disponible: boolean;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Categoria, (cat) => cat.productos, { eager: true, nullable: true })
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @Column({ nullable: true })
  categoriaId: number;
}
