import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaDiaria } from './entities/caja-diaria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CajaDiaria])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
