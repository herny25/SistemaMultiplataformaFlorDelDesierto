import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaDiaria } from './caja-diaria.entity';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { Venta } from '../ventas/venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CajaDiaria, Venta])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService, TypeOrmModule],
})
export class CajaModule {}
