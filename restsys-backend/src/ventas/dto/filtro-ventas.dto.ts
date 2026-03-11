import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente } from '../entities/venta.entity';

export class FiltroVentasDto {
  @ApiPropertyOptional({ example: '2026-02-26' })
  @IsDateString()
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-02-26' })
  @IsDateString()
  @IsOptional()
  hasta?: string;

  @ApiPropertyOptional({ enum: TipoCliente })
  @IsEnum(TipoCliente)
  @IsOptional()
  tipoCliente?: TipoCliente;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  cajaId?: number;
}
