import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmpresaDto {
  @ApiProperty({ example: 'Constructora ABC Ltda.' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: '76.543.210-K' })
  @IsString()
  @IsOptional()
  rut?: string;

  @ApiPropertyOptional({ example: 'María González' })
  @IsString()
  @IsOptional()
  contacto?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'facturacion@empresa.cl' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
