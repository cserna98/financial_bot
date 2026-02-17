import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    // Agregamos esto para que no se quede colgado si el puente falla
    connectionTimeoutMillis: 5000,
});

// Helper para logs rápidos
pool.on('connect', () => {
    console.log('✅ Conexión establecida con Hostinger');
});