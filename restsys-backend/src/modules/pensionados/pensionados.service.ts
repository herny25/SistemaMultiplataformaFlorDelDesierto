import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './empresa.entity';
import { Empleado } from './empleado.entity';
import { PeriodoFacturacion } from './periodo-facturacion.entity';
import {
  CrearEmpresaDto, ActualizarEmpresaDto,
  CrearEmpleadoDto, ActualizarEmpleadoDto,
  GenerarPeriodoDto, ActualizarPeriodoDto,
} from './pensionados.dto';
import { Venta, TipoCliente, EstadoVenta } from '../ventas/venta.entity';
import { Between } from 'typeorm';

@Injectable()
export class PensionadosService {
  constructor(
    @InjectRepository(Empresa)
    private empresasRepo: Repository<Empresa>,
    @InjectRepository(Empleado)
    private empleadosRepo: Repository<Empleado>,
    @InjectRepository(PeriodoFacturacion)
    private periodosRepo: Repository<PeriodoFacturacion>,
    @InjectRepository(Venta)
    private ventasRepo: Repository<Venta>,
  ) {}

  // ── EMPRESAS ─────────────────────────────────────────────────────────────

  async findAllEmpresas(): Promise<Empresa[]> {
    return this.empresasRepo.find({
      where: { activo: true },
      relations: ['empleados'],
    });
  }

  async findEmpresa(id: number): Promise<Empresa> {
    const empresa = await this.empresasRepo.findOne({
      where: { id },
      relations: ['empleados'],
    });
    if (!empresa) throw new NotFoundException(`Empresa #${id} no encontrada`);
    return empresa;
  }

  async createEmpresa(dto: CrearEmpresaDto): Promise<Empresa> {
    const empresa = this.empresasRepo.create(dto);
    return this.empresasRepo.save(empresa);
  }

  async updateEmpresa(id: number, dto: ActualizarEmpresaDto): Promise<Empresa> {
    const empresa = await this.findEmpresa(id);
    Object.assign(empresa, dto);
    return this.empresasRepo.save(empresa);
  }

  // ── EMPLEADOS ────────────────────────────────────────────────────────────

  async findAllEmpleados(empresaId?: number): Promise<Empleado[]> {
    const where: any = { activo: true };
    if (empresaId) where.empresaId = empresaId;
    return this.empleadosRepo.find({ where, relations: ['empresa'] });
  }

  async findEmpleadoPorRut(rut: string): Promise<Empleado> {
    const empleado = await this.empleadosRepo.findOne({
      where: { rut, activo: true },
      relations: ['empresa'],
    });
    if (!empleado) throw new NotFoundException(`Empleado con RUT ${rut} no encontrado`);
    return empleado;
  }

  async createEmpleado(dto: CrearEmpleadoDto): Promise<Empleado> {
    // Verificar que la empresa existe
    await this.findEmpresa(dto.empresaId);
    const empleado = this.empleadosRepo.create(dto);
    return this.empleadosRepo.save(empleado);
  }

  async updateEmpleado(id: number, dto: ActualizarEmpleadoDto): Promise<Empleado> {
    const empleado = await this.empleadosRepo.findOne({ where: { id } });
    if (!empleado) throw new NotFoundException(`Empleado #${id} no encontrado`);
    Object.assign(empleado, dto);
    return this.empleadosRepo.save(empleado);
  }

  // ── PERÍODOS DE FACTURACIÓN ───────────────────────────────────────────────

  async findAllPeriodos(empresaId?: number): Promise<PeriodoFacturacion[]> {
    const where: any = {};
    if (empresaId) where.empresaId = empresaId;
    return this.periodosRepo.find({
      where,
      relations: ['empresa'],
      order: { anio: 'DESC', mes: 'DESC' },
    });
  }

  // Genera el período de facturación calculando los consumos del mes
  async generarPeriodo(dto: GenerarPeriodoDto): Promise<PeriodoFacturacion> {
    // Verificar que no exista ya un período para ese mes/año/empresa
    const existente = await this.periodosRepo.findOne({
      where: { empresaId: dto.empresaId, mes: dto.mes, anio: dto.anio },
    });
    if (existente) {
      throw new BadRequestException(`Ya existe un período de facturación para ${dto.mes}/${dto.anio}`);
    }

    // Calcular el rango de fechas del mes
    const fechaInicio = new Date(dto.anio, dto.mes - 1, 1);
    const fechaFin = new Date(dto.anio, dto.mes, 0, 23, 59, 59); // Último día del mes

    // Buscar todas las ventas de pensionados de esa empresa en ese período
    const ventas = await this.ventasRepo
      .createQueryBuilder('venta')
      .innerJoin('venta.empleado', 'empleado')
      .where('empleado.empresaId = :empresaId', { empresaId: dto.empresaId })
      .andWhere('venta.tipoCliente = :tipo', { tipo: TipoCliente.PENSIONADO })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.PAGADA })
      .andWhere('venta.creadoEn BETWEEN :inicio AND :fin', {
        inicio: fechaInicio,
        fin: fechaFin,
      })
      .getMany();

    const totalConsumos = ventas.reduce((sum, v) => sum + v.total, 0);

    const periodo = this.periodosRepo.create({
      empresaId: dto.empresaId,
      mes: dto.mes,
      anio: dto.anio,
      totalConsumos,
    });

    return this.periodosRepo.save(periodo);
  }

  async actualizarPeriodo(id: number, dto: ActualizarPeriodoDto): Promise<PeriodoFacturacion> {
    const periodo = await this.periodosRepo.findOne({ where: { id } });
    if (!periodo) throw new NotFoundException(`Período #${id} no encontrado`);
    Object.assign(periodo, dto);
    return this.periodosRepo.save(periodo);
  }

  // Detalle de consumos de un empleado en un período
  async getConsumosPorEmpleado(empresaId: number, mes: number, anio: number): Promise<any[]> {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

    const ventas = await this.ventasRepo
      .createQueryBuilder('venta')
      .innerJoinAndSelect('venta.empleado', 'empleado')
      .leftJoinAndSelect('venta.detalles', 'detalle')
      .leftJoinAndSelect('detalle.producto', 'producto')
      .where('empleado.empresaId = :empresaId', { empresaId })
      .andWhere('venta.tipoCliente = :tipo', { tipo: TipoCliente.PENSIONADO })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.PAGADA })
      .andWhere('venta.creadoEn BETWEEN :inicio AND :fin', {
        inicio: fechaInicio,
        fin: fechaFin,
      })
      .orderBy('empleado.nombre', 'ASC')
      .addOrderBy('venta.creadoEn', 'ASC')
      .getMany();

    // Agrupar por empleado
    const porEmpleado: Record<string, any> = {};
    for (const venta of ventas) {
      const key = venta.empleado.id.toString();
      if (!porEmpleado[key]) {
        porEmpleado[key] = {
          empleado: venta.empleado.nombre,
          rut: venta.empleado.rut,
          consumos: [],
          total: 0,
        };
      }
      porEmpleado[key].consumos.push(venta);
      porEmpleado[key].total += venta.total;
    }

    return Object.values(porEmpleado);
  }
}
