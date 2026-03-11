export interface Categoria { id: number; nombre: string; emoji: string; orden: number; }
export type SubcategoriaMenu = 'ENTRADA' | 'FONDO' | 'POSTRE' | 'CAFE_TE' | 'ACOMPANIAMIENTO' | 'AGREGADO';
export const MENUS_CON_AGREGADOS = ['ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL'] as const;
export const TIPOS_CON_SUBCAT = ['ALMUERZO', 'ALMUERZO_ESPECIAL', 'CENA', 'CENA_ESPECIAL', 'DESAYUNO', 'BEBIDA'] as const;
export const SUBCATS_POR_TIPO: Partial<Record<string, SubcategoriaMenu[]>> = {
  ALMUERZO:          ['ENTRADA', 'FONDO', 'POSTRE'],
  ALMUERZO_ESPECIAL: ['ENTRADA', 'FONDO', 'POSTRE'],
  CENA:              ['ENTRADA', 'FONDO', 'POSTRE'],
  CENA_ESPECIAL:     ['ENTRADA', 'FONDO', 'POSTRE'],
  DESAYUNO:          ['CAFE_TE', 'ACOMPANIAMIENTO'],
  BEBIDA:            ['CAFE_TE', 'ACOMPANIAMIENTO'],
};
export interface Producto { id: number; nombre: string; descripcion?: string; precio: number; emoji?: string; tipoMenu: string; subcategoria?: SubcategoriaMenu | null; disponible: boolean; activo: boolean; categoria?: Categoria; categoriaId?: number; }
export type TipoCliente = 'PENSIONADO' | 'PARTICULAR' | 'PARTICULAR_FACTURA' | 'PERSONAL';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CUENTA';
export type EstadoVenta = 'PENDIENTE' | 'PROCESADA' | 'ANULADA' | 'REEMBOLSADA' | 'DEVUELTA';
export interface ItemVenta { id: number; productoId: number; nombreProducto: string; cantidad: number; precioUnitario: number; subtotal: number; producto?: Producto; }
export interface Venta { id: number; tipoCliente: TipoCliente; metodoPago?: MetodoPago; estado: EstadoVenta; nombreCliente?: string; mesa?: string; rutFactura?: string; subtotal: number; total: number; propina?: number; montoRecibido?: number; vuelto?: number; observaciones?: string; garzon?: string; creadaEn: string; procesadaEn?: string; empleado?: Empleado; items: ItemVenta[]; }
export interface CreateVentaDto { tipoCliente: TipoCliente; nombreCliente?: string; mesa?: string; metodoPago?: MetodoPago; rutFactura?: string; empleadoId?: number; propina?: number; montoRecibido?: number; observaciones?: string; garzon?: string; items: { productoId: number; cantidad: number }[]; }
export interface Empresa { id: number; nombre: string; rut?: string; contacto?: string; telefono?: string; email?: string; descripcion?: string; activa: boolean; creadaEn: string; empleados?: Empleado[]; }
export interface Empleado { id: number; nombre: string; rut: string; cargo?: string; activo: boolean; empresa?: Empresa; empresaId: number; }
export type EstadoPeriodo = 'PENDIENTE' | 'FACTURADO' | 'PAGADO';
export interface PeriodoFacturacion { id: number; mes: number; anio: number; estado: EstadoPeriodo; totalMonto: number; fechaFacturado?: string; fechaPagado?: string; observaciones?: string; empresa?: Empresa; empresaId: number; }
export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export interface CajaDiaria { id: number; fecha: string; estado: EstadoCaja; montoInicial: number; totalEfectivo: number; totalTarjeta: number; totalTransferencia: number; totalPensionados: number; totalGeneral: number; totalPropinas: number; montoContado?: number; diferencia?: number; observaciones?: string; abiertoEn: string; cerradoEn?: string; }
export interface AgregadoCarrito { productoId: number; nombre: string; emoji?: string; precio: number; }
export interface ItemCarrito { productoId: number; nombre: string; emoji?: string; precio: number; cantidad: number; subtotal: number; agregados?: AgregadoCarrito[]; }
export interface OrdenGarzon { nombreCliente: string; mesa: string; garzon: string; items: { productoId: number; cantidad: number }[]; observaciones?: string; comandaLineas?: { cantidad: number; nombre: string; agregados?: string[] }[]; }
