import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PensionadosService } from './pensionados.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { CreatePeriodoDto, UpdateEstadoPeriodoDto } from './dto/create-periodo.dto';

@ApiTags('pensionados')
@Controller('pensionados')
export class PensionadosController {
  constructor(private readonly pensionadosService: PensionadosService) {}

  // ── EMPRESAS ──────────────────────────────────────────────────────────────

  @Get('empresas')
  @ApiOperation({ summary: 'Listar empresas con convenio' })
  findEmpresas() {
    return this.pensionadosService.findAllEmpresas();
  }

  @Get('empresas/:id')
  findEmpresa(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.findOneEmpresa(id);
  }

  @Post('empresas')
  @ApiOperation({ summary: 'Registrar nueva empresa con convenio' })
  createEmpresa(@Body() dto: CreateEmpresaDto) {
    return this.pensionadosService.createEmpresa(dto);
  }

  @Patch('empresas/:id')
  updateEmpresa(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpresaDto) {
    return this.pensionadosService.updateEmpresa(id, dto);
  }

  // ── EMPLEADOS ─────────────────────────────────────────────────────────────

  @Get('empleados')
  @ApiOperation({ summary: 'Listar empleados (filtrar por empresa con ?empresaId=)' })
  @ApiQuery({ name: 'empresaId', required: false })
  findEmpleados(@Query('empresaId') empresaId?: number) {
    return this.pensionadosService.findAllEmpleados(empresaId);
  }

  @Get('empleados/buscar-rut')
  @ApiOperation({ summary: 'Buscar empleado por RUT (para verificar en el POS)' })
  @ApiQuery({ name: 'rut', example: '15.678.901-2' })
  findPorRut(@Query('rut') rut: string) {
    return this.pensionadosService.findEmpleadoPorRut(rut);
  }

  @Get('empleados/:id')
  findEmpleado(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.findOneEmpleado(id);
  }

  @Post('empleados')
  @ApiOperation({ summary: 'Registrar nuevo empleado pensionado' })
  createEmpleado(@Body() dto: CreateEmpleadoDto) {
    return this.pensionadosService.createEmpleado(dto);
  }

  @Patch('empleados/:id')
  updateEmpleado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpleadoDto) {
    return this.pensionadosService.updateEmpleado(id, dto);
  }

  // ── PERÍODOS ──────────────────────────────────────────────────────────────

  @Get('periodos/empresa/:empresaId')
  @ApiOperation({ summary: 'Períodos de facturación de una empresa' })
  findPeriodos(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.pensionadosService.findPeriodosByEmpresa(empresaId);
  }

  @Get('periodos/:id')
  findPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.findOnePeriodo(id);
  }

  @Get('periodos/:id/total')
  @ApiOperation({ summary: 'Calcular monto total del período' })
  calcularTotal(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.calcularTotalPeriodo(id);
  }

  @Post('periodos')
  @ApiOperation({ summary: 'Crear período de facturación manualmente' })
  createPeriodo(@Body() dto: CreatePeriodoDto) {
    return this.pensionadosService.createPeriodo(dto);
  }

  @Patch('periodos/:id/estado')
  @ApiOperation({ summary: 'Actualizar estado del período' })
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstadoPeriodoDto) {
    return this.pensionadosService.updateEstadoPeriodo(id, dto);
  }

  @Patch('periodos/:id/recalcular')
  @ApiOperation({ summary: 'Recalcular y guardar el totalMonto del período' })
  recalcularTotal(@Param('id', ParseIntPipe) id: number) {
    return this.pensionadosService.actualizarTotalPeriodo(id);
  }
}
