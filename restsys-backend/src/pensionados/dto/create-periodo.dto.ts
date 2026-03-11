import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPeriodo } from '../entities/periodo-facturacion.entity';

export class CreatePeriodoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  empresaId: number;

  @ApiProperty({ example: 2, description: 'Mes (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  mes: number;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  anio: number;
}

export class UpdateEstadoPeriodoDto {
  @ApiProperty({ enum: EstadoPeriodo })
  @IsEnum(EstadoPeriodo)
  estado: EstadoPeriodo;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;
}
