/**
 * SEED - Datos iniciales para RestSys
 * Ejecutar con: npm run seed
 * 
 * Carga: categorías, productos de ejemplo, empresas y empleados pensionados
 */
import { DataSource } from 'typeorm';
import { Categoria } from '../inventario/entities/categoria.entity';
import { Producto, TipoMenu } from '../inventario/entities/producto.entity';
import { Empresa } from '../pensionados/entities/empresa.entity';
import { Empleado } from '../pensionados/entities/empleado.entity';

import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'restsys',
  entities: [__dirname + '/../**/*.entity.ts'],
  synchronize: false,
  dropSchema: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Iniciando seed...\n');

  // ── LIMPIEZA PREVIA ────────────────────────────────────────────────────────
  await AppDataSource.query('TRUNCATE TABLE items_venta, ventas, cajas_diarias, periodos_facturacion, empleados, empresas, productos, categorias RESTART IDENTITY CASCADE');
  console.log('🗑️  Tablas limpiadas\n');

  // ── CATEGORÍAS ─────────────────────────────────────────────────────────────
  const categoriaRepo = AppDataSource.getRepository(Categoria);

  const categorias = await categoriaRepo.save([
    { nombre: 'Desayuno', emoji: '☀️', orden: 1 },
    { nombre: 'Almuerzo', emoji: '🍽️', orden: 2 },
    { nombre: 'Colación', emoji: '🥪', orden: 3 },
    { nombre: 'Cena',     emoji: '🌙', orden: 4 },
    { nombre: 'Bebidas',  emoji: '🥤', orden: 5 },
    { nombre: 'Otros',    emoji: '➕', orden: 6 },
  ]);
  console.log(`✅ ${categorias.length} categorías creadas`);

  const [desayuno, almuerzo, colacion, cena, bebidas, otros] = categorias;

  // ── PRODUCTOS ──────────────────────────────────────────────────────────────
  const productoRepo = AppDataSource.getRepository(Producto);

  await productoRepo.save([
    // Desayuno
    { nombre: 'Café con leche',             precio:  900, emoji: '☕', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayuno.id },
    { nombre: 'Té',                         precio:  700, emoji: '🍵', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayuno.id },
    { nombre: 'Marraqueta con mantequilla', precio:  600, emoji: '🥖', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayuno.id },
    { nombre: 'Tostadas con palta',         precio: 1800, emoji: '🥑', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayuno.id },

    // Almuerzo
    { nombre: 'Cazuela de vacuno',          precio: 3500, emoji: '🍲', tipoMenu: TipoMenu.ALMUERZO, categoriaId: almuerzo.id },
    { nombre: 'Pollo asado con papas',      precio: 4200, emoji: '🍗', tipoMenu: TipoMenu.ALMUERZO, categoriaId: almuerzo.id },
    { nombre: 'Pastel de choclo',           precio: 3800, emoji: '🥘', tipoMenu: TipoMenu.ALMUERZO, categoriaId: almuerzo.id },
    { nombre: 'Filete de merluza',          precio: 4500, emoji: '🐟', tipoMenu: TipoMenu.ALMUERZO, categoriaId: almuerzo.id },
    { nombre: 'Tallarines bolognesa',       precio: 3200, emoji: '🍝', tipoMenu: TipoMenu.ALMUERZO, categoriaId: almuerzo.id },

    // Colación
    { nombre: 'Sopaipillas (4 un.)',        precio:  800, emoji: '🫓', tipoMenu: TipoMenu.COLACION, categoriaId: colacion.id },
    { nombre: 'Ensalada mixta',             precio: 1500, emoji: '🥗', tipoMenu: TipoMenu.COLACION, categoriaId: colacion.id },
    { nombre: 'Ensalada de tomate',         precio: 1200, emoji: '🍅', tipoMenu: TipoMenu.COLACION, categoriaId: colacion.id },
    { nombre: 'Empanada de pino',           precio: 1200, emoji: '🥟', tipoMenu: TipoMenu.COLACION, categoriaId: colacion.id },

    // Cena
    { nombre: 'Cazuela de pollo',           precio: 3200, emoji: '🍜', tipoMenu: TipoMenu.CENA, categoriaId: cena.id },
    { nombre: 'Arroz con leche',            precio: 2500, emoji: '🍛', tipoMenu: TipoMenu.CENA, categoriaId: cena.id },
    { nombre: 'Tostadas con jamón',         precio: 1800, emoji: '🥪', tipoMenu: TipoMenu.CENA, categoriaId: cena.id },

    // Bebidas
    { nombre: 'Agua mineral',               precio:  800, emoji: '💧', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Jugo de naranja',            precio: 1200, emoji: '🍊', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Bebida en lata',             precio:  900, emoji: '🥤', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Leche',                      precio:  700, emoji: '🥛', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },

    // Otros
    { nombre: 'Kuchen de manzana',          precio: 1500, emoji: '🍰', tipoMenu: TipoMenu.OTRO, categoriaId: otros.id },
    { nombre: 'Flan casero',                precio: 1200, emoji: '🍮', tipoMenu: TipoMenu.OTRO, categoriaId: otros.id },
    { nombre: 'Fruta del tiempo',           precio:  800, emoji: '🍎', tipoMenu: TipoMenu.OTRO, categoriaId: otros.id },
  ]);
  console.log('✅ 23 productos creados');

  // ── EMPRESAS Y EMPLEADOS ───────────────────────────────────────────────────
  const empresaRepo = AppDataSource.getRepository(Empresa);
  const empleadoRepo = AppDataSource.getRepository(Empleado);

  const empresa1 = await empresaRepo.save({
    nombre: 'Constructora Los Andes Ltda.',
    rut: '76.543.210-K',
    contacto: 'María González',
    telefono: '+56 9 8765 4321',
    email: 'admin@losandes.cl',
  });

  const empresa2 = await empresaRepo.save({
    nombre: 'Servicios Técnicos Sur S.A.',
    rut: '77.654.321-5',
    contacto: 'Juan Pérez',
    email: 'contabilidad@stsur.cl',
  });

  console.log('✅ 2 empresas creadas');

  await empleadoRepo.save([
    { nombre: 'Pedro Soto Muñoz', rut: '15.678.901-2', cargo: 'Operador', empresaId: empresa1.id },
    { nombre: 'Ana Fuentes López', rut: '16.789.012-3', cargo: 'Supervisora', empresaId: empresa1.id },
    { nombre: 'Carlos Rojas Vera', rut: '17.890.123-4', cargo: 'Técnico', empresaId: empresa1.id },
    { nombre: 'Luisa Méndez Castro', rut: '18.901.234-5', cargo: 'Administrativa', empresaId: empresa1.id },
    { nombre: 'Roberto Díaz Silva', rut: '19.012.345-6', cargo: 'Ingeniero', empresaId: empresa2.id },
    { nombre: 'Valentina Torres Pino', rut: '20.123.456-7', cargo: 'Contadora', empresaId: empresa2.id },
  ]);
  console.log('✅ 6 empleados pensionados creados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('   Puedes iniciar el servidor con: npm run start:dev');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
