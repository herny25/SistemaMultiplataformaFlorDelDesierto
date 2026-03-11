import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString,
  IsArray, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente, MetodoPago } from '../entities/venta.entity';

export class ItemVentaDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsNumber()
  productoId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  cantidad: number;

  // El precio se toma del producto en el backend para evitar manipulación
}

export class CreateVentaDto {
  @ApiProperty({ enum: TipoCliente })
  @IsEnum(TipoCliente)
  tipoCliente: TipoCliente;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  nombreCliente?: string;

  @ApiPropertyOptional({ example: '5' })
  @IsString()
  @IsOptional()
  mesa?: string;

  @ApiPropertyOptional({ enum: MetodoPago })
  @IsEnum(MetodoPago)
  @IsOptional()
  metodoPago?: MetodoPago;

  @ApiPropertyOptional({ example: '12.345.678-9' })
  @IsString()
  @IsOptional()
  rutFactura?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID empleado (solo para PENSIONADO)' })
  @IsNumber()
  @IsOptional()
  empleadoId?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Monto entregado en efectivo' })
  @IsNumber()
  @IsOptional()
  montoRecibido?: number;

  @ApiPropertyOptional({ example: 500, description: 'Propina voluntaria del cliente' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  propina?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ example: 'Carlos' })
  @IsString()
  @IsOptional()
  garzon?: string;

  @ApiProperty({ type: [ItemVentaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
