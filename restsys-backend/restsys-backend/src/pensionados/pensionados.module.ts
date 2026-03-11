import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PensionadosController } from './pensionados.controller';
import { PensionadosService } from './pensionados.service';
import { Empresa } from './entities/empresa.entity';
import { Empleado } from './entities/empleado.entity';
import { PeriodoFacturacion } from './entities/periodo-facturacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Empleado, PeriodoFacturacion])],
  controllers: [PensionadosController],
  providers: [PensionadosService],
  exports: [PensionadosService],
})
export class PensionadosModule {}
