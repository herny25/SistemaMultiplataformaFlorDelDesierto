import axios from 'axios';
import type { Producto, Categoria, Venta, CreateVentaDto, Empresa, Empleado, PeriodoFacturacion, CajaDiaria } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── PRODUCTOS ─────────────────────────────────────────────────────────────────
export const productosApi = {
  getDisponibles: () => api.get<Producto[]>('/productos/disponibles').then(r => r.data),
  getAll: () => api.get<Producto[]>('/productos').then(r => r.data),
  getCategorias: () => api.get<Categoria[]>('/productos/categorias/todas').then(r => r.data),
  toggleDisponibilidad: (id: number) => api.patch<Producto>(`/productos/${id}/disponibilidad`).then(r => r.data),
  create: (data: Partial<Producto>) => api.post<Producto>('/productos', data).then(r => r.data),
  update: (id: number, data: Partial<Producto>) => api.put<Producto>(`/productos/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/productos/${id}`).then(r => r.data),
  createCategoria: (data: Partial<Categoria>) => api.post<Categoria>('/productos/categorias', data).then(r => r.data),
};

// ── VENTAS ────────────────────────────────────────────────────────────────────
export const ventasApi = {
  getAll: (params?: Record<string, string>) => api.get<Venta[]>('/ventas', { params }).then(r => r.data),
  getOne: (id: number) => api.get<Venta>(`/ventas/${id}`).then(r => r.data),
  create: (data: CreateVentaDto) => api.post<Venta>('/ventas', data).then(r => r.data),
  anular: (id: number) => api.patch<Venta>(`/ventas/${id}/anular`).then(r => r.data),
  cambiarEstado: (id: number, estado: string) => api.patch<Venta>(`/ventas/${id}/estado`, { estado }).then(r => r.data),
  getResumenDia: (fecha?: string) => api.get('/ventas/reportes/dia', { params: { fecha } }).then(r => r.data),
  getResumenPeriodo: (desde: string, hasta: string) => api.get('/ventas/reportes/periodo', { params: { desde, hasta } }).then(r => r.data),
  getReportePensionados: (desde: string, hasta: string) => api.get<any[]>('/ventas/reportes/pensionados', { params: { desde, hasta } }).then(r => r.data),
};

// ── PENSIONADOS ───────────────────────────────────────────────────────────────
export const pensionadosApi = {
  getEmpresas: () => api.get<Empresa[]>('/pensionados/empresas').then(r => r.data),
  getEmpresa: (id: number) => api.get<Empresa>(`/pensionados/empresas/${id}`).then(r => r.data),
  createEmpresa: (data: Partial<Empresa>) => api.post<Empresa>('/pensionados/empresas', data).then(r => r.data),
  updateEmpresa: (id: number, data: Partial<Empresa>) => api.patch<Empresa>(`/pensionados/empresas/${id}`, data).then(r => r.data),

  getEmpleados: (empresaId?: number) => api.get<Empleado[]>('/pensionados/empleados', { params: { empresaId } }).then(r => r.data),
  buscarPorRut: (rut: string) => api.get<Empleado>('/pensionados/empleados/buscar-rut', { params: { rut } }).then(r => r.data),
  createEmpleado: (data: Partial<Empleado>) => api.post<Empleado>('/pensionados/empleados', data).then(r => r.data),
  updateEmpleado: (id: number, data: Partial<Empleado>) => api.patch<Empleado>(`/pensionados/empleados/${id}`, data).then(r => r.data),

  getPeriodos: (empresaId: number) => api.get<PeriodoFacturacion[]>(`/pensionados/periodos/empresa/${empresaId}`).then(r => r.data),
  updateEstadoPeriodo: (id: number, estado: string, observaciones?: string) =>
    api.patch<PeriodoFacturacion>(`/pensionados/periodos/${id}/estado`, { estado, observaciones }).then(r => r.data),
  calcularTotal: (id: number) => api.get<number>(`/pensionados/periodos/${id}/total`).then(r => r.data),
  recalcularTotal: (id: number) => api.patch<PeriodoFacturacion>(`/pensionados/periodos/${id}/recalcular`).then(r => r.data),
};

// ── CAJA ──────────────────────────────────────────────────────────────────────
export const cajaApi = {
  getActiva: () => api.get<CajaDiaria | null>('/caja/activa').then(r => r.data),
  getAll: () => api.get<CajaDiaria[]>('/caja').then(r => r.data),
  abrir: (montoInicial: number, observaciones?: string) =>
    api.post<CajaDiaria>('/caja/abrir', { montoInicial, observaciones }).then(r => r.data),
  cerrar: (id: number, montoContado: number, observaciones?: string) =>
    api.patch<CajaDiaria>(`/caja/${id}/cerrar`, { montoContado, observaciones }).then(r => r.data),
};

export default api;
