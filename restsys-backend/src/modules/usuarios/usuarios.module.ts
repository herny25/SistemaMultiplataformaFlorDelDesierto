import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './usuario.entity';

// Módulo simple para los usuarios del sistema.
// En el futuro aquí se puede agregar autenticación JWT.
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
