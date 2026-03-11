import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CajaDiaria, EstadoCaja } from './caja-diaria.entity';
import { AbrirCajaDto, CerrarCajaDto } from './caja.dto';
import { Venta, EstadoVenta, MetodoPago } from '../ventas/venta.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CajaDiaria)
    private cajaRepo: Repository<CajaDiaria>,
    @InjectRepository(Venta)
    private ventasRepo: Repository<Venta>,
  ) {}

  // Obtener la caja abierta actualmente (si existe)
  async getCajaActual(): Promise<CajaDiaria | null> {
    return this.cajaRepo.findOne({
      where: { estado: EstadoCaja.ABIERTA },
      relations: ['ventas'],
    });
  }

  // Obtener historial de cajas
  async findAll(): Promise<CajaDiaria[]> {
    return this.cajaRepo.find({ order: { fecha: 'DESC' } });
  }

  // Obtener una caja por ID
  async findOne(id: number): Promise<CajaDiaria> {
    const caja = await this.cajaRepo.findOne({
      where: { id },
      relations: ['ventas', 'ventas.detalles', 'ventas.detalles.producto'],
    });
    if (!caja) throw new NotFoundException(`Caja #${id} no encontrada`);
    return caja;
  }

  // Abrir la caja del día
  async abrir(dto: AbrirCajaDto): Promise<CajaDiaria> {
    // Verificar que no haya una caja abierta
    const cajaAbierta = await this.getCajaActual();
    if (cajaAbierta) {
      throw new BadRequestException('Ya existe una caja abierta. Ciérrela antes de abrir una nueva.');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const caja = this.cajaRepo.create({
      fecha: hoy,
      montoInicial: dto.montoInicial,
      notas: dto.notas,
      estado: EstadoCaja.ABIERTA,
      fechaApertura: new Date(),
    });

    return this.cajaRepo.save(caja);
  }

  // Cerrar la caja del día
  async cerrar(dto: CerrarCajaDto): Promise<CajaDiaria> {
    const caja = await this.getCajaActual();
    if (!caja) {
      throw new BadRequestException('No hay una caja abierta para cerrar');
    }

    // Calcular el total de efectivo según el sistema
    const ventasEfectivo = await this.ventasRepo.find({
      where: {
        cajaId: caja.id,
        estado: EstadoVenta.PAGADA,
        metodoPago: MetodoPago.EFECTIVO,
      },
    });

    const totalEfectivoSistema = ventasEfectivo.reduce((sum, v) => sum + v.total, 0);
    const montoFinalSistema = caja.montoInicial + totalEfectivoSistema;
    const diferencia = dto.montoFinalContado - montoFinalSistema;

    caja.montoFinalContado = dto.montoFinalContado;
    caja.montoFinalSistema = montoFinalSistema;
    caja.diferencia = diferencia;
    caja.estado = EstadoCaja.CERRADA;
    caja.fechaCierre = new Date();
    if (dto.notas) caja.notas = dto.notas;

    return this.cajaRepo.save(caja);
  }

  // Resumen detallado de una caja cerrada
  async getResumenCaja(id: number): Promise<any> {
    const caja = await this.findOne(id);

    const ventas = await this.ventasRepo.find({
      where: { cajaId: id, estado: EstadoVenta.PAGADA },
    });

    const resumenPorMetodo: Record<string, number> = {};
    let totalVentas = 0;

    for (const venta of ventas) {
      totalVentas += venta.total;
      const metodo = venta.metodoPago || 'SIN_METODO';
      resumenPorMetodo[metodo] = (resumenPorMetodo[metodo] || 0) + venta.total;
    }

    return {
      caja,
      totalVentas: ventas.length,
      totalMonto: totalVentas,
      porMetodoPago: resumenPorMetodo,
    };
  }
}
