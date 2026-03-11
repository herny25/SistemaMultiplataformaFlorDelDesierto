import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Producto) private productoRepo: Repository<Producto>,
    @InjectRepository(Categoria) private categoriaRepo: Repository<Categoria>,
  ) {}

  // ── PRODUCTOS ─────────────────────────────────────────────────────────────

  async findAllProductos(): Promise<Producto[]> {
    return this.productoRepo.find({
      where: { activo: true },
      order: { categoria: { orden: 'ASC' }, nombre: 'ASC' },
    });
  }

  async findProductosDisponibles(): Promise<Producto[]> {
    return this.productoRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .where('producto.activo = true')
      .andWhere('producto.disponible = true')
      .orderBy('COALESCE(categoria.orden, 9999)', 'ASC')
      .addOrderBy('producto.tipoMenu', 'ASC')
      .addOrderBy('producto.subcategoria', 'ASC', 'NULLS LAST')
      .addOrderBy('producto.nombre', 'ASC')
      .getMany();
  }

  async findOneProducto(id: number): Promise<Producto> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
    return producto;
  }

  async createProducto(dto: CreateProductoDto): Promise<Producto> {
    const producto = this.productoRepo.create(dto);
    return this.productoRepo.save(producto);
  }

  async updateProducto(id: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOneProducto(id);
    Object.assign(producto, dto);
    return this.productoRepo.save(producto);
  }

  async toggleDisponibilidad(id: number): Promise<Producto> {
    const producto = await this.findOneProducto(id);
    producto.disponible = !producto.disponible;
    return this.productoRepo.save(producto);
  }

  async removeProducto(id: number): Promise<void> {
    const producto = await this.findOneProducto(id);
    producto.activo = false; // Soft delete
    await this.productoRepo.save(producto);
  }

  // ── CATEGORÍAS ────────────────────────────────────────────────────────────

  async findAllCategorias(): Promise<Categoria[]> {
    return this.categoriaRepo.find({
      where: { activa: true },
      order: { orden: 'ASC' },
    });
  }

  async createCategoria(dto: CreateCategoriaDto): Promise<Categoria> {
    const categoria = this.categoriaRepo.create(dto);
    return this.categoriaRepo.save(categoria);
  }

  async updateCategoria(id: number, dto: Partial<CreateCategoriaDto>): Promise<Categoria> {
    const categoria = await this.categoriaRepo.findOne({ where: { id } });
    if (!categoria) throw new NotFoundException(`Categoría #${id} no encontrada`);
    Object.assign(categoria, dto);
    return this.categoriaRepo.save(categoria);
  }
}
