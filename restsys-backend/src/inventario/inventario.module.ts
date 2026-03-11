import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria])],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService], // Exportado para que VentasService pueda usarlo
})
export class InventarioModule {}
