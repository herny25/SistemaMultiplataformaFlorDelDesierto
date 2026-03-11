import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Categoria } from './categoria.entity';

export enum TipoMenu {
  DESAYUNO = 'DESAYUNO',
  ALMUERZO = 'ALMUERZO',
  ALMUERZO_ESPECIAL = 'ALMUERZO_ESPECIAL',
  CENA = 'CENA',
  CENA_ESPECIAL = 'CENA_ESPECIAL',
  COLACION = 'COLACION',
  COLACION_ESPECIAL = 'COLACION_ESPECIAL',
  COLACION_MEDIA_MANANA = 'COLACION_MEDIA_MANANA',
  COLACION_FRIA = 'COLACION_FRIA',
  BEBIDA = 'BEBIDA',
  OTRO = 'OTRO',
}

export enum SubcategoriaMenu {
  ENTRADA         = 'ENTRADA',
  FONDO           = 'FONDO',
  POSTRE          = 'POSTRE',
  CAFE_TE         = 'CAFE_TE',
  ACOMPANIAMIENTO = 'ACOMPANIAMIENTO',
  AGREGADO        = 'AGREGADO',
}

export const TIPOS_CON_SUBCAT: TipoMenu[] = [
  TipoMenu.ALMUERZO,
  TipoMenu.ALMUERZO_ESPECIAL,
  TipoMenu.CENA,
  TipoMenu.CENA_ESPECIAL,
  TipoMenu.DESAYUNO,
  TipoMenu.BEBIDA,
];

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

  @Column({ type: 'enum', enum: SubcategoriaMenu, nullable: true })
  subcategoria: SubcategoriaMenu | null;

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
