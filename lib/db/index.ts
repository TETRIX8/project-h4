import 'server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDatabase = globalThis as unknown as { installmentPool?: Pool }

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  })
}

export const pool = globalForDatabase.installmentPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalForDatabase.installmentPool = pool

export const db = drizzle(pool, { schema })
