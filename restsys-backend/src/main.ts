import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para que el frontend React pueda conectarse
  app.enableCors({
    origin: process.env.CORS_ORIGIN === 'http://localhost:5173'
      ? true   // En desarrollo: acepta cualquier origen (incluye el celular)
      : process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Ignora campos no declarados en el DTO
      forbidNonWhitelisted: false,
      transform: true,         // Convierte tipos automáticamente (ej. string → number)
    }),
  );

  // Prefijo global para todas las rutas: /api/...
  app.setGlobalPrefix('api');

  // Documentación Swagger en /api/docs
  const config = new DocumentBuilder()
    .setTitle('RestSys API')
    .setDescription('API del sistema de gestión de ventas y caja para restaurante')
    .setVersion('1.0')
    .addTag('ventas', 'Gestión de ventas y órdenes')
    .addTag('productos', 'Catálogo de productos y categorías')
    .addTag('pensionados', 'Empresas y empleados con convenio')
    .addTag('caja', 'Apertura y cierre de caja diaria')
    .addTag('reportes', 'Reportes y estadísticas')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 RestSys Backend corriendo en: http://localhost:${port}`);
  console.log(`📚 Documentación Swagger: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket disponible en: ws://localhost:${port}\n`);
}
bootstrap();
