import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsInt()
  @Min(0)
  montoInicial: number; // Cuánto dinero hay en caja al abrir

  @IsOptional()
  @IsString()
  notas?: string;
}

export class CerrarCajaDto {
  @IsInt()
  @Min(0)
  montoFinalContado: number; // Cuánto dinero hay en caja al cerrar (contado físicamente)

  @IsOptional()
  @IsString()
  notas?: string;
}
