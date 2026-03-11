/**
 * Configuración de DataSource para TypeORM CLI (migrations)
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'restsys',
  entities: [__dirname + '/../**/*.entity.ts'],
  migrations: [__dirname + '/migrations/*.ts'],
});
