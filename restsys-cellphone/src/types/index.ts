export type TipoMenu =
  | 'DESAYUNO' | 'ALMUERZO' | 'ALMUERZO_ESPECIAL'
  | 'COLACION' | 'COLACION_ESPECIAL' | 'COLACION_MEDIA_MANANA' | 'COLACION_FRIA'
  | 'CENA' | 'CENA_ESPECIAL' | 'BEBIDA' | 'OTRO';

export type SubcategoriaMenu = 'ENTRADA' | 'FONDO' | 'POSTRE' | 'CAFE_TE' | 'ACOMPANIAMIENTO' | 'AGREGADO';

export const TIPOS_CON_SUBCAT: TipoMenu[] = [
  'ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL', 'DESAYUNO', 'BEBIDA',
];

export const MENUS_CON_AGREGADOS = ['ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL'] as const;

export const SUBCATS_POR_TIPO: Partial<Record<TipoMenu, { id: SubcategoriaMenu; label: string }[]>> = {
  ALMUERZO:          [{ id: 'ENTRADA', label: 'Entrada' }, { id: 'FONDO', label: 'Fondo' }, { id: 'POSTRE', label: 'Postre' }],
  ALMUERZO_ESPECIAL: [{ id: 'ENTRADA', label: 'Entrada' }, { id: 'FONDO', label: 'Fondo' }, { id: 'POSTRE', label: 'Postre' }],
  CENA:              [{ id: 'ENTRADA', label: 'Entrada' }, { id: 'FONDO', label: 'Fondo' }, { id: 'POSTRE', label: 'Postre' }],
  CENA_ESPECIAL:     [{ id: 'ENTRADA', label: 'Entrada' }, { id: 'FONDO', label: 'Fondo' }, { id: 'POSTRE', label: 'Postre' }],
  DESAYUNO:          [{ id: 'CAFE_TE', label: 'Té / Café' }, { id: 'ACOMPANIAMIENTO', label: 'Sándwich / Acompaño' }],
  BEBIDA:            [{ id: 'CAFE_TE', label: 'Té / Café' }, { id: 'ACOMPANIAMIENTO', label: 'Sándwich / Acompaño' }],
};

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  emoji?: string;
  tipoMenu: TipoMenu;
  subcategoria?: SubcategoriaMenu | null;
  disponible: boolean;
  categoria?: { id: number; nombre: string; emoji: string; orden: number };
  categoriaId?: number;
}
export interface Categoria { id: number; nombre: string; emoji: string; orden: number; }
export interface AgregadoCarrito { productoId: number; nombre: string; emoji?: string; precio: number; }
export interface ItemCarrito { productoId: number; nombre: string; emoji?: string; precio: number; cantidad: number; subtotal?: number; agregados?: AgregadoCarrito[]; }
export interface OrdenEnviada { id: string; nombreCliente: string; mesa: string; garzon: string; items: ItemCarrito[]; observaciones?: string; enviadaEn: Date; estado: 'ENVIADA' | 'PROCESADA' | 'ERROR'; }
