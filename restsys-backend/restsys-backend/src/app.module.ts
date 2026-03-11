import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasModule } from './ventas/ventas.module';
import { PensionadosModule } from './pensionados/pensionados.module';
import { CajaModule } from './caja/caja.module';
import { InventarioModule } from './inventario/inventario.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Carga variables de entorno desde .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'password'),
        database: config.get('DB_DATABASE', 'restsys'),
        // Carga automáticamente todas las entidades registradas
        autoLoadEntities: true,
        // En desarrollo, sincroniza el schema automáticamente
        // En producción usar migrations en lugar de synchronize: true
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Módulos de negocio
    VentasModule,
    PensionadosModule,
    CajaModule,
    InventarioModule,
    WebsocketModule,
  ],
})
export class AppModule {}
