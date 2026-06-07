import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export async function createPgAdapter() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaPg(pool)
}