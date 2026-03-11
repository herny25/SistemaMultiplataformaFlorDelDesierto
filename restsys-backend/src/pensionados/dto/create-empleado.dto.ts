import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmpleadoDto {
  @ApiProperty({ example: 'Pedro Soto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: '15.678.901-2' })
  @IsString()
  @IsNotEmpty()
  rut: string;

  @ApiPropertyOptional({ example: 'Operador' })
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  empresaId: number;
}
