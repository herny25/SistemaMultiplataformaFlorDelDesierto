import { IsString, IsOptional, IsInt, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { EstadoPeriodo } from './periodo-facturacion.entity';

export class CrearEmpresaDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(12)
  rut: string;

  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @IsOptional()
  @IsString()
  contactoEmail?: string;
}

export class ActualizarEmpresaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @IsOptional()
  @IsString()
  contactoEmail?: string;
}

export class CrearEmpleadoDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(12)
  rut: string;

  @IsInt()
  empresaId: number;
}

export class ActualizarEmpleadoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  empresaId?: number;
}

// Para generar el período de facturación mensual de una empresa
export class GenerarPeriodoDto {
  @IsInt()
  empresaId: number;

  @IsInt()
  mes: number; // 1-12

  @IsInt()
  anio: number;
}

export class ActualizarPeriodoDto {
  @IsOptional()
  @IsEnum(EstadoPeriodo)
  estado?: EstadoPeriodo;

  @IsOptional()
  @IsDateString()
  fechaFactura?: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
