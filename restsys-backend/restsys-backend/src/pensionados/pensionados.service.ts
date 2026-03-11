import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './entities/empresa.entity';
import { Empleado } from './entities/empleado.entity';
import { PeriodoFacturacion, EstadoPeriodo } from './entities/periodo-facturacion.entity';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { CreatePeriodoDto, UpdateEstadoPeriodoDto } from './dto/create-periodo.dto';

@Injectable()
export class PensionadosService {
  constructor(
    @InjectRepository(Empresa) private empresaRepo: Repository<Empresa>,
    @InjectRepository(Empleado) private empleadoRepo: Repository<Empleado>,
    @InjectRepository(PeriodoFacturacion) private periodoRepo: Repository<PeriodoFacturacion>,
  ) {}

  // ── EMPRESAS ──────────────────────────────────────────────────────────────

  async findAllEmpresas(): Promise<Empresa[]> {
    return this.empresaRepo.find({
      where: { activa: true },
      relations: ['empleados'],
      order: { nombre: 'ASC' },
    });
  }

  async findOneEmpresa(id: number): Promise<Empresa> {
    const empresa = await this.empresaRepo.findOne({
      where: { id },
      relations: ['empleados'],
    });
    if (!empresa) throw new NotFoundException(`Empresa #${id} no encontrada`);
    return empresa;
  }

  async createEmpresa(dto: CreateEmpresaDto): Promise<Empresa> {
    const empresa = this.empresaRepo.create(dto);
    return this.empresaRepo.save(empresa);
  }

  async updateEmpresa(id: number, dto: UpdateEmpresaDto): Promise<Empresa> {
    const empresa = await this.findOneEmpresa(id);
    Object.assign(empresa, dto);
    return this.empresaRepo.save(empresa);
  }

  // ── EMPLEADOS ─────────────────────────────────────────────────────────────

  async findAllEmpleados(empresaId?: number): Promise<Empleado[]> {
    const where: any = { activo: true };
    if (empresaId) where.empresaId = empresaId;
    return this.empleadoRepo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOneEmpleado(id: number): Promise<Empleado> {
    const empleado = await this.empleadoRepo.findOne({ where: { id } });
    if (!empleado) throw new NotFoundException(`Empleado #${id} no encontrado`);
    return empleado;
  }

  // Buscar empleado por RUT (para verificar en el POS)
  async findEmpleadoPorRut(rut: string): Promise<Empleado | null> {
    return this.empleadoRepo.findOne({ where: { rut, activo: true } });
  }

  async createEmpleado(dto: CreateEmpleadoDto): Promise<Empleado> {
    const empleado = this.empleadoRepo.create(dto);
    return this.empleadoRepo.save(empleado);
  }

  async updateEmpleado(id: number, dto: UpdateEmpleadoDto): Promise<Empleado> {
    const empleado = await this.findOneEmpleado(id);
    Object.assign(empleado, dto);
    return this.empleadoRepo.save(empleado);
  }

  // ── PERÍODOS DE FACTURACIÓN ───────────────────────────────────────────────

  async findPeriodosByEmpresa(empresaId: number): Promise<PeriodoFacturacion[]> {
    return this.periodoRepo.find({
      where: { empresaId },
      order: { anio: 'DESC', mes: 'DESC' },
    });
  }

  async findOnePeriodo(id: number): Promise<PeriodoFacturacion> {
    const periodo = await this.periodoRepo.findOne({ where: { id }, relations: ['empresa'] });
    if (!periodo) throw new NotFoundException(`Período #${id} no encontrado`);
    return periodo;
  }

  // Obtiene o crea el período activo para una empresa en el mes/año dado
  async getOrCreatePeriodoActivo(empresaId: number, mes: number, anio: number): Promise<number> {
    let periodo = await this.periodoRepo.findOne({
      where: { empresaId, mes, anio },
    });

    if (!periodo) {
      periodo = this.periodoRepo.create({ empresaId, mes, anio });
      periodo = await this.periodoRepo.save(periodo);
    }

    return periodo.id;
  }

  async createPeriodo(dto: CreatePeriodoDto): Promise<PeriodoFacturacion> {
    const periodo = this.periodoRepo.create(dto);
    return this.periodoRepo.save(periodo);
  }

  async updateEstadoPeriodo(id: number, dto: UpdateEstadoPeriodoDto): Promise<PeriodoFacturacion> {
    const periodo = await this.findOnePeriodo(id);
    periodo.estado = dto.estado;
    if (dto.observaciones) periodo.observaciones = dto.observaciones;
    if (dto.estado === EstadoPeriodo.FACTURADO) periodo.fechaFacturado = new Date();
    if (dto.estado === EstadoPeriodo.PAGADO) periodo.fechaPagado = new Date();
    return this.periodoRepo.save(periodo);
  }

  // Calcular monto total del período sumando las ventas de pensionados
  async calcularTotalPeriodo(periodoId: number): Promise<number> {
    const result = await this.periodoRepo.manager.query(
      `SELECT COALESCE(SUM(v.total), 0) as total 
       FROM ventas v 
       WHERE v."periodoFacturacionId" = $1 AND v.estado = 'PROCESADA'`,
      [periodoId],
    );
    return Number(result[0]?.total || 0);
  }
}
