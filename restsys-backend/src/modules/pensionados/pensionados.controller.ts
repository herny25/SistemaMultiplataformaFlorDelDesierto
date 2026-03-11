import {
  Controller, Get, Post, Put, Patch, Param, Body, Query, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PensionadosService } from './pensionados.service';
import {
  CrearEmpresaDto, ActualizarEmpresaDto,
  CrearEmpleadoDto, ActualizarEmpleadoDto,
  GenerarPeriodoDto, ActualizarPeriodoDto,
} from './pensionados.dto';

@ApiTags('Pensionados')
@Controller('pensionados')
export class PensionadosController {
  constructor(private readonly pensionadosService: PensionadosService) {}

  // ── EMPRESAS ──────────────────────────────────────────────────────────────

  @Get('empresas')
  findAllEmpresas() {
    return this.pensionadosService.findAllEmpresas();
  }

  @Get('empresas/:id')
  findEmpresa(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.findEmpresa(id);
  }

  @Post('empresas')
  createEmpresa(@Body() dto: CrearEmpresaDto) {
    return this.pensionadosService.createEmpresa(dto);
  }

  @Put('empresas/:id')
  updateEmpresa(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarEmpresaDto) {
    return this.pensionadosService.updateEmpresa(id, dto);
  }

  // ── EMPLEADOS ─────────────────────────────────────────────────────────────

  @Get('empleados')
  findAllEmpleados(@Query('empresaId') empresaId?: string) {
    return this.pensionadosService.findAllEmpleados(
      empresaId ? parseInt(empresaId) : undefined
    );
  }

  // GET /api/pensionados/empleados/rut/12.345.678-9
  @Get('empleados/rut/:rut')
  @ApiOperation({ summary: 'Buscar empleado por RUT (para validar en POS)' })
  findEmpleadoPorRut(@Param('rut') rut: string) {
    return this.pensionadosService.findEmpleadoPorRut(rut);
  }

  @Post('empleados')
  createEmpleado(@Body() dto: CrearEmpleadoDto) {
    return this.pensionadosService.createEmpleado(dto);
  }

  @Put('empleados/:id')
  updateEmpleado(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarEmpleadoDto) {
    return this.pensionadosService.updateEmpleado(id, dto);
  }

  // ── PERÍODOS DE FACTURACIÓN ───────────────────────────────────────────────

  @Get('periodos')
  findAllPeriodos(@Query('empresaId') empresaId?: string) {
    return this.pensionadosService.findAllPeriodos(
      empresaId ? parseInt(empresaId) : undefined
    );
  }

  // GET /api/pensionados/consumos?empresaId=1&mes=1&anio=2025
  @Get('consumos')
  @ApiOperation({ summary: 'Detalle de consumos por empleado en un período' })
  getConsumos(
    @Query('empresaId') empresaId: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    return this.pensionadosService.getConsumosPorEmpleado(
      parseInt(empresaId),
      parseInt(mes),
      parseInt(anio),
    );
  }

  @Post('periodos')
  @ApiOperation({ summary: 'Generar período de facturación mensual' })
  generarPeriodo(@Body() dto: GenerarPeriodoDto) {
    return this.pensionadosService.generarPeriodo(dto);
  }

  @Patch('periodos/:id')
  @ApiOperation({ summary: 'Actualizar estado del período (PENDIENTE → FACTURADO → PAGADO)' })
  actualizarPeriodo(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPeriodoDto) {
    return this.pensionadosService.actualizarPeriodo(id, dto);
  }
}
