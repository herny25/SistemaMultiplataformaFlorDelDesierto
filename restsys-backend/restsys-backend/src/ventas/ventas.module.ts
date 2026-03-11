import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { ItemVenta } from './entities/item-venta.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { CajaModule } from '../caja/caja.module';
import { PensionadosModule } from '../pensionados/pensionados.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, ItemVenta]),
    InventarioModule,
    CajaModule,
    PensionadosModule,
    WebsocketModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
