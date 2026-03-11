import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { AbrirCajaDto, CerrarCajaDto } from './caja.dto';

@ApiTags('Caja')
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  // GET /api/caja — Historial de cajas
  @Get()
  findAll() {
    return this.cajaService.findAll();
  }

  // GET /api/caja/actual — Caja actualmente abierta
  @Get('actual')
  @ApiOperation({ summary: 'Obtener la caja abierta actualmente' })
  getCajaActual() {
    return this.cajaService.getCajaActual();
  }

  // GET /api/caja/5
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cajaService.findOne(id);
  }

  // GET /api/caja/5/resumen
  @Get(':id/resumen')
  @ApiOperation({ summary: 'Resumen detallado de una caja' })
  getResumen(@Param('id', ParseIntPipe) id: number) {
    return this.cajaService.getResumenCaja(id);
  }

  // POST /api/caja/abrir
  @Post('abrir')
  @ApiOperation({ summary: 'Abrir la caja del día' })
  abrir(@Body() dto: AbrirCajaDto) {
    return this.cajaService.abrir(dto);
  }

  // POST /api/caja/cerrar
  @Post('cerrar')
  @ApiOperation({ summary: 'Cerrar la caja del día' })
  cerrar(@Body() dto: CerrarCajaDto) {
    return this.cajaService.cerrar(dto);
  }
}
