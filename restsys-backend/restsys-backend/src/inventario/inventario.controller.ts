import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventarioService } from './inventario.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@ApiTags('productos')
@Controller('productos')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  // ── PRODUCTOS ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos activos' })
  findAll() {
    return this.inventarioService.findAllProductos();
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Listar productos disponibles para venta (menú activo)' })
  findDisponibles() {
    return this.inventarioService.findProductosDisponibles();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.findOneProducto(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  create(@Body() dto: CreateProductoDto) {
    return this.inventarioService.createProducto(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.inventarioService.updateProducto(id, dto);
  }

  @Patch(':id/disponibilidad')
  @ApiOperation({ summary: 'Cambiar disponibilidad del producto (toggle)' })
  toggleDisponibilidad(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.toggleDisponibilidad(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.removeProducto(id);
  }

  // ── CATEGORÍAS ────────────────────────────────────────────────────────────

  @Get('categorias/todas')
  @ApiOperation({ summary: 'Listar categorías' })
  findCategorias() {
    return this.inventarioService.findAllCategorias();
  }

  @Post('categorias')
  createCategoria(@Body() dto: CreateCategoriaDto) {
    return this.inventarioService.createCategoria(dto);
  }

  @Put('categorias/:id')
  updateCategoria(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCategoriaDto) {
    return this.inventarioService.updateCategoria(id, dto);
  }
}
