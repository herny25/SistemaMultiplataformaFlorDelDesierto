import { Body, Controller, Get, Param, ParseIntPipe, Post, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { AbrirCajaDto, CerrarCajaDto } from './dto/caja.dto';

@ApiTags('caja')
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de cajas' })
  findAll() {
    return this.cajaService.getCajas();
  }

  @Get('activa')
  @ApiOperation({ summary: 'Obtener caja actualmente abierta' })
  getCajaActiva() {
    return this.cajaService.getCajaActiva();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cajaService.getCajaById(id);
  }

  @Post('abrir')
  @ApiOperation({ summary: 'Abrir caja del día con monto inicial' })
  abrir(@Body() dto: AbrirCajaDto) {
    return this.cajaService.abrirCaja(dto);
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar caja con conteo final de efectivo' })
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarCajaDto) {
    return this.cajaService.cerrarCaja(id, dto);
  }
}
