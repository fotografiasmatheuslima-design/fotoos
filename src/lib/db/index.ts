import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Previne multiplas conexoes em dev com hot-reload
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined
}

const connection = globalForDb.connection ?? postgres(
  process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  { prepare: false, ssl: 'require' }
)

if (process.env.NODE_ENV !== 'production') globalForDb.connection = connection

export const db = drizzle(connection, { schema })
export type Db = typeof db
