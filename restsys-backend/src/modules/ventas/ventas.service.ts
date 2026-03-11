import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Venta, TipoCliente, EstadoVenta, MetodoPago } from './venta.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { Producto } from '../productos/producto.entity';
import { CrearVentaDto, PagarVentaDto, FiltrarVentasDto } from './venta.dto';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepo: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepo: Repository<DetalleVenta>,
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
  ) {}

  // Obtener todas las ventas del día actual
  async findHoy(): Promise<Venta[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const maniana = new Date(hoy);
    maniana.setDate(maniana.getDate() + 1);

    return this.ventasRepo.find({
      where: { creadoEn: Between(hoy, maniana) },
      relations: ['detalles', 'detalles.producto', 'empleado', 'empleado.empresa'],
      order: { creadoEn: 'DESC' },
    });
  }

  // Obtener ventas con filtros
  async findConFiltros(filtros: FiltrarVentasDto): Promise<Venta[]> {
    const query = this.ventasRepo.createQueryBuilder('venta')
      .leftJoinAndSelect('venta.detalles', 'detalle')
      .leftJoinAndSelect('detalle.producto', 'producto')
      .leftJoinAndSelect('venta.empleado', 'empleado')
      .leftJoinAndSelect('empleado.empresa', 'empresa')
      .orderBy('venta.creadoEn', 'DESC');

    if (filtros.tipoCliente) {
      query.andWhere('venta.tipoCliente = :tipo', { tipo: filtros.tipoCliente });
    }

    if (filtros.fechaDesde) {
      query.andWhere('venta.creadoEn >= :desde', { desde: new Date(filtros.fechaDesde) });
    }

    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta);
      hasta.setHours(23, 59, 59);
      query.andWhere('venta.creadoEn <= :hasta', { hasta });
    }

    return query.getMany();
  }

  // Obtener una venta por ID
  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventasRepo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.producto', 'empleado', 'empleado.empresa'],
    });
    if (!venta) {
      throw new NotFoundException(`Venta #${id} no encontrada`);
    }
    return venta;
  }

  // Crear una venta nueva (puede venir del cajero o del garzón via WebSocket)
  async create(dto: CrearVentaDto, cajaId?: number): Promise<Venta> {
    // Validaciones de negocio
    if (dto.tipoCliente === TipoCliente.PENSIONADO && !dto.empleadoId) {
      throw new BadRequestException('Para pensionados se requiere el ID del empleado');
    }
    if (dto.tipoCliente === TipoCliente.PARTICULAR_FACTURA && !dto.rutCliente) {
      throw new BadRequestException('Para particulares con factura se requiere el RUT del cliente');
    }
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    // Calcular total y construir detalles
    let total = 0;
    const detalles: Partial<DetalleVenta>[] = [];

    for (const item of dto.detalles) {
      const producto = await this.productosRepo.findOne({ where: { id: item.productoId } });
      if (!producto) {
        throw new NotFoundException(`Producto #${item.productoId} no encontrado`);
      }
      const subtotal = producto.precio * item.cantidad;
      total += subtotal;
      detalles.push({
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
        subtotal,
        notas: item.notas,
      });
    }

    // Determinar método de pago automático según tipo de cliente
    let metodoPago: MetodoPago | null = null;
    if (dto.tipoCliente === TipoCliente.PENSIONADO) {
      metodoPago = MetodoPago.CUENTA_EMPRESA;
    } else if (dto.tipoCliente === TipoCliente.PERSONAL) {
      metodoPago = MetodoPago.SIN_COBRO;
    }

    // Crear la venta
    const venta = this.ventasRepo.create({
      tipoCliente: dto.tipoCliente,
      rutCliente: dto.rutCliente,
      nombreCliente: dto.nombreCliente,
      mesa: dto.mesa,
      garzon: dto.garzon,
      notas: dto.notas,
      empleadoId: dto.empleadoId,
      cajaId: cajaId || null,
      total,
      metodoPago,
      // Pensionados y personal se marcan como PAGADAS directamente (no requieren cobro en caja)
      estado: (dto.tipoCliente === TipoCliente.PENSIONADO || dto.tipoCliente === TipoCliente.PERSONAL)
        ? EstadoVenta.PAGADA
        : EstadoVenta.PENDIENTE,
    });

    const ventaGuardada = await this.ventasRepo.save(venta);

    // Guardar los detalles asociados a la venta
    for (const det of detalles) {
      await this.detallesRepo.save({ ...det, ventaId: ventaGuardada.id });
    }

    return this.findOne(ventaGuardada.id);
  }

  // Procesar el cobro de una venta pendiente
  async pagar(id: number, dto: PagarVentaDto): Promise<Venta> {
    const venta = await this.findOne(id);

    if (venta.estado === EstadoVenta.PAGADA) {
      throw new BadRequestException('Esta venta ya fue pagada');
    }
    if (venta.estado === EstadoVenta.ANULADA) {
      throw new BadRequestException('No se puede pagar una venta anulada');
    }

    venta.metodoPago = dto.metodoPago;
    venta.estado = EstadoVenta.PAGADA;

    if (dto.rutCliente) venta.rutCliente = dto.rutCliente;
    if (dto.empleadoId) venta.empleadoId = dto.empleadoId;

    return this.ventasRepo.save(venta);
  }

  // Anular una venta
  async anular(id: number): Promise<Venta> {
    const venta = await this.findOne(id);
    venta.estado = EstadoVenta.ANULADA;
    return this.ventasRepo.save(venta);
  }

  // Resumen de ventas para reportes
  async getResumenDia(fecha?: string): Promise<any> {
    const dia = fecha ? new Date(fecha) : new Date();
    dia.setHours(0, 0, 0, 0);
    const siguiente = new Date(dia);
    siguiente.setDate(siguiente.getDate() + 1);

    const ventas = await this.ventasRepo.find({
      where: {
        creadoEn: Between(dia, siguiente),
        estado: EstadoVenta.PAGADA,
      },
    });

    const resumen = {
      fecha: dia.toISOString().split('T')[0],
      totalVentas: ventas.length,
      totalMonto: ventas.reduce((sum, v) => sum + v.total, 0),
      porTipoCliente: {} as Record<string, { cantidad: number; monto: number }>,
      porMetodoPago: {} as Record<string, number>,
    };

    for (const venta of ventas) {
      // Por tipo de cliente
      if (!resumen.porTipoCliente[venta.tipoCliente]) {
        resumen.porTipoCliente[venta.tipoCliente] = { cantidad: 0, monto: 0 };
      }
      resumen.porTipoCliente[venta.tipoCliente].cantidad++;
      resumen.porTipoCliente[venta.tipoCliente].monto += venta.total;

      // Por método de pago
      if (venta.metodoPago) {
        resumen.porMetodoPago[venta.metodoPago] =
          (resumen.porMetodoPago[venta.metodoPago] || 0) + venta.total;
      }
    }

    return resumen;
  }
}
