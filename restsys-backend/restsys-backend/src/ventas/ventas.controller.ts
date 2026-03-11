import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { FiltroVentasDto } from './dto/filtro-ventas.dto';

@ApiTags('ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ventas con filtros opcionales' })
  findAll(@Query() filtros: FiltroVentasDto) {
    return this.ventasService.findAll(filtros);
  }

  @Get('reportes/dia')
  @ApiOperation({ summary: 'Resumen de ventas del día' })
  @ApiQuery({ name: 'fecha', required: false, example: '2026-02-26' })
  getResumenDia(@Query('fecha') fecha?: string) {
    return this.ventasService.getResumenDia(fecha);
  }

  @Get('reportes/periodo')
  @ApiOperation({ summary: 'Resumen de ventas por período' })
  @ApiQuery({ name: 'desde', example: '2026-02-01' })
  @ApiQuery({ name: 'hasta', example: '2026-02-28' })
  getResumenPeriodo(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.ventasService.getResumenPeriodo(desde, hasta);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva venta' })
  create(@Body() dto: CreateVentaDto) {
    return this.ventasService.crearVenta(dto);
  }

  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular una venta' })
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.anularVenta(id);
  }
}
