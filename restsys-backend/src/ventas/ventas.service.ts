import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Venta, EstadoVenta, MetodoPago, TipoCliente } from './entities/venta.entity';
import { ItemVenta } from './entities/item-venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { FiltroVentasDto } from './dto/filtro-ventas.dto';
import { InventarioService } from '../inventario/inventario.service';
import { CajaService } from '../caja/caja.service';
import { PensionadosService } from '../pensionados/pensionados.service';
import { OrdenesgGateway } from '../websocket/ordenes.gateway';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
    @InjectRepository(ItemVenta) private itemRepo: Repository<ItemVenta>,
    private inventarioService: InventarioService,
    private cajaService: CajaService,
    private pensionadosService: PensionadosService,
    private ordenesGateway: OrdenesgGateway,
  ) {}

  async findAll(filtros: FiltroVentasDto): Promise<Venta[]> {
    const query = this.ventaRepo.createQueryBuilder('venta')
      .leftJoinAndSelect('venta.items', 'items')
      .leftJoinAndSelect('items.producto', 'producto')
      .leftJoinAndSelect('venta.empleado', 'empleado')
      .leftJoinAndSelect('empleado.empresa', 'empresa')
      .orderBy('venta.creadaEn', 'DESC');

    if (filtros.desde) {
      query.andWhere('venta.creadaEn >= :desde', { desde: filtros.desde });
    }
    if (filtros.hasta) {
      query.andWhere('venta.creadaEn <= :hasta', { hasta: filtros.hasta + ' 23:59:59' });
    }
    if (filtros.tipoCliente) {
      query.andWhere('venta.tipoCliente = :tipo', { tipo: filtros.tipoCliente });
    }
    if (filtros.cajaId) {
      query.andWhere('venta.cajaId = :cajaId', { cajaId: filtros.cajaId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['items', 'items.producto', 'empleado', 'empleado.empresa'],
    });
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada`);
    return venta;
  }

  // Crear una venta/orden (puede venir del garzón vía WS o del cajero manualmente)
  async crearVenta(dto: CreateVentaDto): Promise<Venta> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un ítem');
    }

    // Validar tipo de cliente y campos requeridos
    if (dto.tipoCliente === TipoCliente.PENSIONADO && !dto.empleadoId) {
      throw new BadRequestException('Para PENSIONADO se requiere el ID del empleado');
    }
    if (dto.tipoCliente === TipoCliente.PARTICULAR_FACTURA && !dto.rutFactura) {
      throw new BadRequestException('Para PARTICULAR_FACTURA se requiere el RUT');
    }

    // Cargar productos y calcular totales
    let subtotal = 0;
    const itemsConDetalle = [];

    for (const itemDto of dto.items) {
      const producto = await this.inventarioService.findOneProducto(itemDto.productoId);
      if (!producto.disponible) {
        throw new BadRequestException(`El producto "${producto.nombre}" no está disponible`);
      }
      const subtotalItem = producto.precio * itemDto.cantidad;
      subtotal += subtotalItem;
      itemsConDetalle.push({
        productoId: producto.id,
        nombreProducto: producto.nombre,
        cantidad: itemDto.cantidad,
        precioUnitario: producto.precio,
        subtotal: subtotalItem,
      });
    }

    const total = subtotal; // Sin descuentos por ahora
    const propina = dto.propina ?? 0;

    // Calcular vuelto si es efectivo (la propina se descuenta del cambio)
    let vuelto = null;
    if (dto.metodoPago === MetodoPago.EFECTIVO && dto.montoRecibido) {
      if (dto.montoRecibido < total + propina) {
        throw new BadRequestException('El monto recibido es insuficiente');
      }
      vuelto = dto.montoRecibido - total - propina;
    }

    // Determinar método de pago para pensionados
    const metodoPago = dto.tipoCliente === TipoCliente.PENSIONADO
      ? MetodoPago.CUENTA
      : dto.tipoCliente === TipoCliente.PERSONAL
        ? null
        : dto.metodoPago;

    // Obtener caja activa
    const cajaActiva = await this.cajaService.getCajaActiva();

    // Obtener período de facturación para pensionados
    let periodoId = null;
    if (dto.tipoCliente === TipoCliente.PENSIONADO && dto.empleadoId) {
      const empleado = await this.pensionadosService.findOneEmpleado(dto.empleadoId);
      const now = new Date();
      periodoId = await this.pensionadosService.getOrCreatePeriodoActivo(
        empleado.empresaId,
        now.getMonth() + 1,
        now.getFullYear(),
      );
    }

    // Crear la venta
    const venta = this.ventaRepo.create({
      tipoCliente: dto.tipoCliente,
      metodoPago,
      estado: EstadoVenta.PROCESADA,
      nombreCliente: dto.nombreCliente,
      mesa: dto.mesa,
      rutFactura: dto.rutFactura,
      empleadoId: dto.empleadoId,
      periodoFacturacionId: periodoId,
      subtotal,
      total,
      propina,
      montoRecibido: dto.montoRecibido,
      vuelto,
      observaciones: dto.observaciones,
      garzon: dto.garzon,
      cajaId: cajaActiva?.id,
      procesadaEn: new Date(),
      items: itemsConDetalle,
    });

    const ventaGuardada = await this.ventaRepo.save(venta);

    // Actualizar totales de la caja
    if (cajaActiva && metodoPago) {
      await this.cajaService.actualizarTotalesCaja(cajaActiva.id, metodoPago, total, propina);
    } else if (cajaActiva && propina > 0) {
      // PERSONAL no tiene metodoPago pero podría tener propina
      await this.cajaService.actualizarTotalesCaja(cajaActiva.id, 'EFECTIVO', 0, propina);
    }

    // Actualizar total del período de facturación
    if (periodoId) {
      await this.pensionadosService.actualizarTotalPeriodo(periodoId);
    }

    // Notificar al frontend vía WebSocket
    this.ordenesGateway.notificarNuevaVenta(ventaGuardada);

    return ventaGuardada;
  }

  async anularVenta(id: number): Promise<Venta> {
    return this.cambiarEstadoVenta(id, EstadoVenta.ANULADA);
  }

  async cambiarEstadoVenta(id: number, nuevoEstado: EstadoVenta): Promise<Venta> {
    const ESTADOS_FINALES = [EstadoVenta.ANULADA, EstadoVenta.REEMBOLSADA, EstadoVenta.DEVUELTA];
    const venta = await this.findOne(id);

    if (ESTADOS_FINALES.includes(venta.estado)) {
      throw new BadRequestException(`La venta ya está en estado ${venta.estado} y no puede modificarse`);
    }

    venta.estado = nuevoEstado;
    const ventaActualizada = await this.ventaRepo.save(venta);

    // Recalcular total del período si corresponde
    if (venta.periodoFacturacionId) {
      await this.pensionadosService.actualizarTotalPeriodo(venta.periodoFacturacionId);
    }

    return ventaActualizada;
  }

  // Reportes
  async getResumenDia(fecha?: string): Promise<any> {
    const fechaBase = fecha ? new Date(fecha) : new Date();
    const inicioStr = `${fechaBase.toISOString().split('T')[0]} 00:00:00-03`;
    const finStr = `${fechaBase.toISOString().split('T')[0]} 23:59:59-03`;

    const ventas = await this.ventaRepo.find({
      where: { creadaEn: Between(new Date(inicioStr), new Date(finStr)), estado: EstadoVenta.PROCESADA },
    });

    const resumen = {
      fecha: fechaBase.toISOString().split('T')[0],
      totalVentas: ventas.length,
      totalGeneral: ventas.reduce((acc, v) => acc + Number(v.total), 0),
      porTipoCliente: {
        PENSIONADO: 0, PARTICULAR: 0, PARTICULAR_FACTURA: 0, PERSONAL: 0,
      },
      porMetodoPago: {
        EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CUENTA: 0,
      },
    };

    for (const venta of ventas) {
      resumen.porTipoCliente[venta.tipoCliente] += Number(venta.total);
      if (venta.metodoPago) {
        resumen.porMetodoPago[venta.metodoPago] += Number(venta.total);
      }
    }

    return resumen;
  }

  async getReportePensionados(desde: string, hasta: string): Promise<any[]> {
    const rows = await this.ventaRepo.manager.query(
      `SELECT
         e.id           AS "empleadoId",
         e.nombre       AS "empleadoNombre",
         emp.nombre     AS "empresaNombre",
         p."tipoMenu"   AS "tipoMenu"
       FROM ventas v
       JOIN items_venta iv  ON iv."ventaId"   = v.id
       JOIN productos p     ON p.id           = iv."productoId"
       JOIN empleados e     ON e.id           = v."empleadoId"
       JOIN empresas emp    ON emp.id         = e."empresaId"
       WHERE v."tipoCliente" = 'PENSIONADO'
         AND v.estado        = 'PROCESADA'
         AND v."creadaEn"   >= $1
         AND v."creadaEn"   <= $2
         AND p."tipoMenu"   IN ('DESAYUNO', 'ALMUERZO', 'COLACION', 'CENA')
       GROUP BY e.id, e.nombre, emp.nombre, p."tipoMenu"`,
      [desde, hasta + ' 23:59:59'],
    );

    const byEmployee: Record<number, any> = {};
    for (const row of rows) {
      if (!byEmployee[row.empleadoId]) {
        byEmployee[row.empleadoId] = {
          empleadoId: row.empleadoId,
          nombre: row.empleadoNombre,
          empresa: row.empresaNombre,
          consumos: { DESAYUNO: false, ALMUERZO: false, COLACION: false, CENA: false },
        };
      }
      byEmployee[row.empleadoId].consumos[row.tipoMenu] = true;
    }

    return Object.values(byEmployee).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getResumenPeriodo(desde: string, hasta: string): Promise<any> {
    const inicio = new Date(desde);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(hasta);
    fin.setHours(23, 59, 59, 999);

    const ventas = await this.ventaRepo.find({
      where: { creadaEn: Between(inicio, fin), estado: EstadoVenta.PROCESADA },
    });

    // Agrupar por día
    const porDia: Record<string, number> = {};
    for (const venta of ventas) {
      const dia = venta.creadaEn.toISOString().split('T')[0];
      porDia[dia] = (porDia[dia] || 0) + Number(venta.total);
    }

    return {
      desde,
      hasta,
      totalVentas: ventas.length,
      totalGeneral: ventas.reduce((acc, v) => acc + Number(v.total), 0),
      porDia: Object.entries(porDia).map(([fecha, total]) => ({ fecha, total })),
    };
  }
}
