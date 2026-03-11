import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AbrirCajaDto {
  @ApiProperty({ example: 50000, description: 'Monto inicial en caja (billetes y monedas)' })
  @IsNumber()
  @Min(0)
  montoInicial: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class CerrarCajaDto {
  @ApiProperty({ example: 75000, description: 'Monto contado físicamente al cierre' })
  @IsNumber()
  @Min(0)
  montoContado: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;
}
