import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductosService } from './productos.service';
import { CrearProductoDto, ActualizarProductoDto } from './producto.dto';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // GET /api/productos — Obtener todos los productos activos
  // GET /api/productos?todos=true — Incluir inactivos
  @Get()
  @ApiOperation({ summary: 'Listar productos' })
  findAll(@Query('todos') todos?: string) {
    const soloActivos = todos !== 'true';
    return this.productosService.findAll(soloActivos);
  }

  // GET /api/productos/5
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

  // POST /api/productos
  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CrearProductoDto) {
    return this.productosService.create(dto);
  }

  // PUT /api/productos/5
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarProductoDto) {
    return this.productosService.update(id, dto);
  }

  // DELETE /api/productos/5 — Desactiva el producto (no lo borra)
  @Delete(':id')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.desactivar(id);
  }
}
