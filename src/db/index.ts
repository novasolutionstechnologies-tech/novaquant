import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export const isSqlConfigured = Boolean(
  process.env.SQL_HOST &&
  process.env.SQL_USER &&
  process.env.SQL_DB_NAME
);

// Function to create or retrieve the connection pool (Object Method)
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || 'localhost',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'postgres',
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });

    // Prevent unhandled pool-level errors from crashing the application or filling logs
    global._postgresPool.on('error', (err: any) => {
      // Ignore routine idle socket closures or connection termination when backend is not attached to Cloud SQL socket
      if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOENT' || err?.message?.includes('Connection terminated unexpectedly')) {
        return;
      }
      console.warn('[SQL Pool Warning]', err?.message || err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
