import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CrearProductoDto, ActualizarProductoDto } from './producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
  ) {}

  // Obtener todos los productos activos
  async findAll(soloActivos = true): Promise<Producto[]> {
    if (soloActivos) {
      return this.productosRepo.find({ where: { activo: true } });
    }
    return this.productosRepo.find();
  }

  // Obtener un producto por ID
  async findOne(id: number): Promise<Producto> {
    const producto = await this.productosRepo.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException(`Producto #${id} no encontrado`);
    }
    return producto;
  }

  // Crear producto nuevo
  async create(dto: CrearProductoDto): Promise<Producto> {
    const producto = this.productosRepo.create(dto);
    return this.productosRepo.save(producto);
  }

  // Actualizar producto existente
  async update(id: number, dto: ActualizarProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);
    Object.assign(producto, dto);
    return this.productosRepo.save(producto);
  }

  // Desactivar producto (no se elimina, solo se marca inactivo)
  async desactivar(id: number): Promise<Producto> {
    const producto = await this.findOne(id);
    producto.activo = false;
    return this.productosRepo.save(producto);
  }
}
