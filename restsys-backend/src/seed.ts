/**
 * Script de seed — pobla la base de datos con datos de prueba
 * 
 * Uso: npx ts-node src/seed.ts
 * 
 * Crea:
 * - 12 productos del menú
 * - 2 empresas con convenio
 * - 5 empleados pensionados
 * - 1 cajero y 2 garzones
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Producto, CategoriaProducto } from './modules/productos/producto.entity';
import { Empresa } from './modules/pensionados/empresa.entity';
import { Empleado } from './modules/pensionados/empleado.entity';
import { PeriodoFacturacion } from './modules/pensionados/periodo-facturacion.entity';
import { Venta } from './modules/ventas/venta.entity';
import { DetalleVenta } from './modules/ventas/detalle-venta.entity';
import { CajaDiaria } from './modules/caja/caja-diaria.entity';
import { Usuario, RolUsuario } from './modules/usuarios/usuario.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'restsys',
  entities: [__dirname + '/../**/*.entity.ts'],
  synchronize: true,
  dropSchema: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Conectado a la base de datos\n');

  // ── PRODUCTOS ──────────────────────────────────────────────────────────────
  console.log('🍽️  Creando productos...');
  const productosRepo = AppDataSource.getRepository(Producto);
  
  const productos = await productosRepo.save([
    { nombre: 'Cazuela de Vacuno', precio: 3500, categoria: CategoriaProducto.PLATO_PRINCIPAL },
    { nombre: 'Pollo Asado', precio: 4200, categoria: CategoriaProducto.PLATO_PRINCIPAL },
    { nombre: 'Pastel de Choclo', precio: 3800, categoria: CategoriaProducto.PLATO_PRINCIPAL },
    { nombre: 'Lentejas con Arroz', precio: 2800, categoria: CategoriaProducto.PLATO_PRINCIPAL },
    { nombre: 'Sopaipillas (4 unid)', precio: 800, categoria: CategoriaProducto.ENTRADA },
    { nombre: 'Ensalada Chilena', precio: 1500, categoria: CategoriaProducto.ENTRADA },
    { nombre: 'Empanada de Pino', precio: 1200, categoria: CategoriaProducto.ENTRADA },
    { nombre: 'Leche Asada', precio: 1000, categoria: CategoriaProducto.POSTRE },
    { nombre: 'Fruta del Tiempo', precio: 800, categoria: CategoriaProducto.POSTRE },
    { nombre: 'Agua Mineral', precio: 600, categoria: CategoriaProducto.BEBIDA },
    { nombre: 'Jugo Natural', precio: 900, categoria: CategoriaProducto.BEBIDA },
    { nombre: 'Bebida en Lata', precio: 700, categoria: CategoriaProducto.BEBIDA },
  ]);
  console.log(`   ✅ ${productos.length} productos creados`);

  // ── EMPRESAS ───────────────────────────────────────────────────────────────
  console.log('🏢  Creando empresas con convenio...');
  const empresasRepo = AppDataSource.getRepository(Empresa);
  
  const empresas = await empresasRepo.save([
    {
      nombre: 'Constructora Los Andes',
      rut: '76.543.210-5',
      contactoNombre: 'María González',
      contactoTelefono: '+56 9 8765 4321',
      contactoEmail: 'contabilidad@losandes.cl',
    },
    {
      nombre: 'Clínica San Martín',
      rut: '77.890.123-4',
      contactoNombre: 'Pedro Soto',
      contactoTelefono: '+56 9 1234 5678',
      contactoEmail: 'administracion@clinicasanmartin.cl',
    },
  ]);
  console.log(`   ✅ ${empresas.length} empresas creadas`);

  // ── EMPLEADOS ──────────────────────────────────────────────────────────────
  console.log('👷  Creando empleados pensionados...');
  const empleadosRepo = AppDataSource.getRepository(Empleado);
  
  await empleadosRepo.save([
    { nombre: 'Carlos Muñoz', rut: '15.234.567-8', empresaId: empresas[0].id },
    { nombre: 'Ana Rojas', rut: '16.345.678-9', empresaId: empresas[0].id },
    { nombre: 'Luis Pérez', rut: '14.123.456-7', empresaId: empresas[0].id },
    { nombre: 'Claudia Vega', rut: '17.456.789-0', empresaId: empresas[1].id },
    { nombre: 'Roberto Silva', rut: '13.012.345-6', empresaId: empresas[1].id },
  ]);
  console.log('   ✅ 5 empleados creados');

  // ── USUARIOS ───────────────────────────────────────────────────────────────
  console.log('👤  Creando usuarios del sistema...');
  const usuariosRepo = AppDataSource.getRepository(Usuario);
  
  await usuariosRepo.save([
    { nombre: 'Cajero Principal', usuario: 'cajero', password: 'cajero123', rol: RolUsuario.CAJERO },
    { nombre: 'Garzón Juan', usuario: 'juan', password: 'juan123', rol: RolUsuario.GARZON },
    { nombre: 'Garzón Sofía', usuario: 'sofia', password: 'sofia123', rol: RolUsuario.GARZON },
  ]);
  console.log('   ✅ 3 usuarios creados');

  await AppDataSource.destroy();
  
  console.log(`
╔═══════════════════════════════════════╗
║        ✅ Seed completado             ║
║                                       ║
║  La base de datos tiene datos de      ║
║  prueba listos para usar.             ║
╚═══════════════════════════════════════╝
  `);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
