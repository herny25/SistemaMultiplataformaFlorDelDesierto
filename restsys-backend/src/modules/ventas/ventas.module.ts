import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { OrdenesGateway } from './ordenes.gateway';
import { Producto } from '../productos/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, DetalleVenta, Producto])],
  controllers: [VentasController],
  providers: [VentasService, OrdenesGateway],
  exports: [VentasService, TypeOrmModule], // Exporta para CajaModule y PensionadosModule
})
export class VentasModule {}
