import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CrearVentaDto, PagarVentaDto, FiltrarVentasDto } from './venta.dto';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // GET /api/ventas — Ventas del día con filtros opcionales
  @Get()
  @ApiOperation({ summary: 'Listar ventas (filtros opcionales por fecha y tipo)' })
  findAll(@Query() filtros: FiltrarVentasDto) {
    const hayFiltros = filtros.fechaDesde || filtros.fechaHasta || filtros.tipoCliente;
    if (hayFiltros) {
      return this.ventasService.findConFiltros(filtros);
    }
    return this.ventasService.findHoy();
  }

  // GET /api/ventas/resumen?fecha=2025-01-15
  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de ventas del día (para reportes)' })
  getResumen(@Query('fecha') fecha?: string) {
    return this.ventasService.getResumenDia(fecha);
  }

  // GET /api/ventas/5
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  // POST /api/ventas — Crear venta (desde cajero o desde garzón)
  @Post()
  @ApiOperation({ summary: 'Crear nueva venta' })
  create(@Body() dto: CrearVentaDto) {
    return this.ventasService.create(dto);
  }

  // PATCH /api/ventas/5/pagar — Procesar cobro
  @Patch(':id/pagar')
  @ApiOperation({ summary: 'Procesar pago de una venta pendiente' })
  pagar(@Param('id', ParseIntPipe) id: number, @Body() dto: PagarVentaDto) {
    return this.ventasService.pagar(id, dto);
  }

  // PATCH /api/ventas/5/anular
  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular una venta' })
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.anular(id);
  }
}
