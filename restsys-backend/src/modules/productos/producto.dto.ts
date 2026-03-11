import { IsString, IsInt, IsOptional, IsEnum, IsBoolean, Min, MaxLength } from 'class-validator';
import { CategoriaProducto } from './producto.entity';

export class CrearProductoDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsEnum(CategoriaProducto)
  categoria?: CategoriaProducto;
}

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsEnum(CategoriaProducto)
  categoria?: CategoriaProducto;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
