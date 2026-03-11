import {
  IsString, IsInt, IsOptional, IsEnum, IsArray,
  ValidateNested, Min, IsNumber
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCliente, MetodoPago } from './venta.entity';

// DTO para cada ítem dentro de la venta
export class DetalleVentaDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  notas?: string;
}

// DTO para crear una venta nueva
export class CrearVentaDto {
  @IsEnum(TipoCliente)
  tipoCliente: TipoCliente;

  @IsOptional()
  @IsString()
  rutCliente?: string; // Obligatorio si tipoCliente = PARTICULAR_FACTURA

  @IsOptional()
  @IsString()
  nombreCliente?: string; // Obligatorio si tipoCliente = PENSIONADO

  @IsOptional()
  @IsInt()
  empleadoId?: number; // Obligatorio si tipoCliente = PENSIONADO

  @IsOptional()
  @IsString()
  mesa?: string;

  @IsOptional()
  @IsString()
  garzon?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];
}

// DTO para procesar el pago de una venta pendiente
export class PagarVentaDto {
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  rutCliente?: string;

  @IsOptional()
  @IsInt()
  empleadoId?: number;
}

// DTO para filtrar ventas
export class FiltrarVentasDto {
  @IsOptional()
  @IsString()
  fechaDesde?: string; // Formato: YYYY-MM-DD

  @IsOptional()
  @IsString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(TipoCliente)
  tipoCliente?: TipoCliente;
}
