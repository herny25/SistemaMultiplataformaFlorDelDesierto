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

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'restsys',
  entities: [__dirname + '/../**/*.entity.ts'],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Iniciando seed...\n');

  // ── CATEGORÍAS ─────────────────────────────────────────────────────────────
  const categoriaRepo = AppDataSource.getRepository(Categoria);

  const categorias = await categoriaRepo.save([
    { nombre: 'Desayunos', emoji: '☕', orden: 1 },
    { nombre: 'Platos de fondo', emoji: '🍽️', orden: 2 },
    { nombre: 'Ensaladas', emoji: '🥗', orden: 3 },
    { nombre: 'Bebidas', emoji: '🥤', orden: 4 },
    { nombre: 'Postres', emoji: '🍰', orden: 5 },
  ]);
  console.log(`✅ ${categorias.length} categorías creadas`);

  const [desayunos, fondos, ensaladas, bebidas, postres] = categorias;

  // ── PRODUCTOS ──────────────────────────────────────────────────────────────
  const productoRepo = AppDataSource.getRepository(Producto);

  await productoRepo.save([
    // Desayunos
    { nombre: 'Café con leche', precio: 900, emoji: '☕', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayunos.id },
    { nombre: 'Té', precio: 700, emoji: '🍵', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayunos.id },
    { nombre: 'Marraqueta con mantequilla', precio: 600, emoji: '🥖', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayunos.id },
    { nombre: 'Tostadas con palta', precio: 1800, emoji: '🥑', tipoMenu: TipoMenu.DESAYUNO, categoriaId: desayunos.id },

    // Platos de fondo
    { nombre: 'Cazuela de vacuno', precio: 3500, emoji: '🍲', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },
    { nombre: 'Pollo asado con papas', precio: 4200, emoji: '🍗', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },
    { nombre: 'Pastel de choclo', precio: 3800, emoji: '🥘', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },
    { nombre: 'Filete de merluza', precio: 4500, emoji: '🐟', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },
    { nombre: 'Tallarines con salsa bolognesa', precio: 3200, emoji: '🍝', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },
    { nombre: 'Arroz con leche', precio: 2500, emoji: '🍛', tipoMenu: TipoMenu.ALMUERZO, categoriaId: fondos.id },

    // Ensaladas
    { nombre: 'Ensalada mixta', precio: 1500, emoji: '🥗', tipoMenu: TipoMenu.ALMUERZO, categoriaId: ensaladas.id },
    { nombre: 'Ensalada de tomate', precio: 1200, emoji: '🍅', tipoMenu: TipoMenu.ALMUERZO, categoriaId: ensaladas.id },

    // Bebidas
    { nombre: 'Agua mineral', precio: 800, emoji: '💧', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Jugo de naranja', precio: 1200, emoji: '🍊', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Bebida en lata', precio: 900, emoji: '🥤', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },
    { nombre: 'Leche', precio: 700, emoji: '🥛', tipoMenu: TipoMenu.BEBIDA, categoriaId: bebidas.id },

    // Postres
    { nombre: 'Kuchen de manzana', precio: 1500, emoji: '🍰', tipoMenu: TipoMenu.ALMUERZO, categoriaId: postres.id },
    { nombre: 'Flan casero', precio: 1200, emoji: '🍮', tipoMenu: TipoMenu.ALMUERZO, categoriaId: postres.id },
  ]);
  console.log('✅ 18 productos creados');

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
