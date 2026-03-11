import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empresa } from './empresa.entity';
import { Empleado } from './empleado.entity';
import { PeriodoFacturacion } from './periodo-facturacion.entity';
import { PensionadosService } from './pensionados.service';
import { PensionadosController } from './pensionados.controller';
import { Venta } from '../ventas/venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Empleado, PeriodoFacturacion, Venta])],
  controllers: [PensionadosController],
  providers: [PensionadosService],
  exports: [PensionadosService, TypeOrmModule],
})
export class PensionadosModule {}
