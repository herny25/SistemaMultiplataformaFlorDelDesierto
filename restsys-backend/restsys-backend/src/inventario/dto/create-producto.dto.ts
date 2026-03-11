import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMenu } from '../entities/producto.entity';

export class CreateProductoDto {
  @ApiProperty({ example: 'Cazuela de vacuno' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Con papas y arroz' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 3500 })
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiPropertyOptional({ example: '🍲' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ enum: TipoMenu, example: TipoMenu.ALMUERZO })
  @IsEnum(TipoMenu)
  @IsOptional()
  tipoMenu?: TipoMenu;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  categoriaId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  disponible?: boolean;
}
