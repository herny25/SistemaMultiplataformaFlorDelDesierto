import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CajaDiaria, EstadoCaja } from './entities/caja-diaria.entity';
import { AbrirCajaDto, CerrarCajaDto } from './dto/caja.dto';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CajaDiaria)
    private cajaRepo: Repository<CajaDiaria>,
  ) {}

  // Obtiene la caja abierta del día actual
  async getCajaActiva(): Promise<CajaDiaria | null> {
    return this.cajaRepo.findOne({
      where: { estado: EstadoCaja.ABIERTA },
      order: { abiertoEn: 'DESC' },
    });
  }

  async getCajaById(id: number): Promise<CajaDiaria> {
    const caja = await this.cajaRepo.findOne({ where: { id } });
    if (!caja) throw new NotFoundException(`Caja #${id} no encontrada`);
    return caja;
  }

  async getCajas(): Promise<CajaDiaria[]> {
    return this.cajaRepo.find({ order: { abiertoEn: 'DESC' } });
  }

  async abrirCaja(dto: AbrirCajaDto): Promise<CajaDiaria> {
    // Verificar que no haya una caja abierta
    const cajaActiva = await this.getCajaActiva();
    if (cajaActiva) {
      throw new BadRequestException('Ya existe una caja abierta. Debe cerrarla primero.');
    }

    const caja = this.cajaRepo.create({
      fecha: new Date(),
      montoInicial: dto.montoInicial,
      observaciones: dto.observaciones,
      estado: EstadoCaja.ABIERTA,
    });

    return this.cajaRepo.save(caja);
  }

  async cerrarCaja(id: number, dto: CerrarCajaDto): Promise<CajaDiaria> {
    const caja = await this.getCajaById(id);

    if (caja.estado === EstadoCaja.CERRADA) {
      throw new BadRequestException('Esta caja ya está cerrada.');
    }

    // Calcular diferencia: lo que debería haber vs lo que se contó
    const efectivoEsperado = Number(caja.montoInicial) + Number(caja.totalEfectivo);
    const diferencia = Number(dto.montoContado) - efectivoEsperado;

    caja.montoContado = dto.montoContado;
    caja.diferencia = diferencia;
    caja.estado = EstadoCaja.CERRADA;
    caja.cerradoEn = new Date();
    if (dto.observaciones) caja.observaciones = dto.observaciones;

    return this.cajaRepo.save(caja);
  }

  // Método llamado por VentasService para actualizar totales de la caja
  async actualizarTotalesCaja(cajaId: number, metodoPago: string, monto: number): Promise<void> {
    const caja = await this.getCajaById(cajaId);

    switch (metodoPago) {
      case 'EFECTIVO':
        caja.totalEfectivo = Number(caja.totalEfectivo) + monto;
        break;
      case 'TARJETA':
        caja.totalTarjeta = Number(caja.totalTarjeta) + monto;
        break;
      case 'TRANSFERENCIA':
        caja.totalTransferencia = Number(caja.totalTransferencia) + monto;
        break;
      case 'CUENTA':
        caja.totalPensionados = Number(caja.totalPensionados) + monto;
        break;
    }
    caja.totalGeneral = Number(caja.totalGeneral) + monto;

    await this.cajaRepo.save(caja);
  }
}
